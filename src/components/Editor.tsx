import { useRef, useState } from 'react';
import { Point, Viewport, Wall } from '../types';
import { closestPointOnSegment, dist, SNAP_PIXELS, wallPolygon } from '../utils/geometry';
import './Editor.css';

interface EditorProps {
  walls: Wall[];
  selectedId: string | null;
  tool: 'select' | 'pan';
  onSelect: (id: string | null) => void;
  onMoveEndpoint: (id: string, which: 'start' | 'end', p: Point) => void;
}

// distance from a point to a wall segment, used for hit testing
function pointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
}

export function Editor({ walls, selectedId, tool, onSelect, onMoveEndpoint }: EditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 80, y: 80, scale: 28 });
  const [drag, setDrag] = useState<{ id: string; which: 'start' | 'end' } | null>(null);
  const [panning, setPanning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // convert a mouse event to world coordinates
  const toWorld = (e: any): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - viewport.x) / viewport.scale,
      y: (e.clientY - rect.top - viewport.y) / viewport.scale,
    };
  };

  // zoom towards the mouse cursor
  const handleWheel = (e: any) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setViewport({
      scale: viewport.scale * factor,
      x: mx - (mx - viewport.x) * factor,
      y: my - (my - viewport.y) * factor,
    });
  };

  const handlePointerDown = (e: any) => {
    if (tool === 'pan') {
      setPanning(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: any) => {
    if (panning) {
      setViewport({
        ...viewport,
        x: viewport.x + (e.clientX - lastPos.current.x),
        y: viewport.y + (e.clientY - lastPos.current.y),
      });
      lastPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (drag) {
      let p = toWorld(e);
      // Phase 1: Snap to nearest endpoint of other walls (endpoint snap must win when both in range)
      let bestEndpoint: Point | null = null;
      let bestEndpointDistPx = SNAP_PIXELS;

      for (const w of walls) {
        if (w.id === drag.id) continue;

        const dStartPx = dist(p, w.start) * viewport.scale;
        if (dStartPx < bestEndpointDistPx) {
          bestEndpointDistPx = dStartPx;
          bestEndpoint = w.start;
        }

        const dEndPx = dist(p, w.end) * viewport.scale;
        if (dEndPx < bestEndpointDistPx) {
          bestEndpointDistPx = dEndPx;
          bestEndpoint = w.end;
        }
      }

      if (bestEndpoint) {
        p = { x: bestEndpoint.x, y: bestEndpoint.y };
      } else {
        // Phase 2: If no endpoint in range, check for T-junction snap onto other walls' centerlines
        let bestCenterline: Point | null = null;
        let bestCenterlineDistPx = SNAP_PIXELS;

        for (const w of walls) {
          if (w.id === drag.id) continue;

          const closest = closestPointOnSegment(p, w.start, w.end);
          const dCenterPx = dist(p, closest) * viewport.scale;
          if (dCenterPx < bestCenterlineDistPx) {
            bestCenterlineDistPx = dCenterPx;
            bestCenterline = closest;
          }
        }

        if (bestCenterline) {
          p = { x: bestCenterline.x, y: bestCenterline.y };
        }
      }
      onMoveEndpoint(drag.id, drag.which, p);
    }
  };

  const handlePointerUp = () => {
    setPanning(false);
    setDrag(null);
  };

  // figure out which wall was clicked
  const handleClick = (e: any) => {
    if (tool !== 'select' || drag) return;
    const p = toWorld(e);
    let hit: string | null = null;
    for (const w of walls) {
      const d = pointToSegment(p.x, p.y, w.start.x, w.start.y, w.end.x, w.end.y);
      if (d < w.thickness / 2 + 0.15) {
        hit = w.id;
        break;
      }
    }
    onSelect(hit);
  };

  const selected = walls.find((w) => w.id === selectedId);

  return (
    <div className="editor">
      <svg
        ref={svgRef}
        className="editor-svg"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
      >
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
          {walls.map((w, i) => (
            <polygon
              key={i}
              points={wallPolygon(w)}
              fill={w.id === selectedId ? '#4a90d9' : '#555b63'}
              stroke={w.id === selectedId ? '#2f6cb0' : 'none'}
              strokeWidth={0.05}
            />
          ))}
          {selected && (
            <>
              {/* Start Endpoint: Invisible Hitbox + Crisp Visual Dot */}
              <circle
                cx={selected.start.x}
                cy={selected.start.y}
                r={Math.max(selected.thickness / 2 + 0.1, 18 / viewport.scale)}
                fill="transparent"
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDrag({ id: selected.id, which: 'start' });
                }}
              />
              <circle
                cx={selected.start.x}
                cy={selected.start.y}
                r={8 / viewport.scale}
                fill="#ffffff"
                stroke="#2f6cb0"
                strokeWidth={1.5 / viewport.scale}
                pointerEvents="none"
              />

              {/* End Endpoint: Invisible Hitbox + Crisp Visual Dot */}
              <circle
                cx={selected.end.x}
                cy={selected.end.y}
                r={Math.max(selected.thickness / 2 + 0.1, 18 / viewport.scale)}
                fill="transparent"
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDrag({ id: selected.id, which: 'end' });
                }}
              />
              <circle
                cx={selected.end.x}
                cy={selected.end.y}
                r={8 / viewport.scale}
                fill="#ffffff"
                stroke="#2f6cb0"
                strokeWidth={1.5 / viewport.scale}
                pointerEvents="none"
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
