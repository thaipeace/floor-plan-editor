import { Wall } from '../types';
import './SidePanel.css';

interface SidePanelProps {
  walls: Wall[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onThickness: (id: string, thickness: number) => void;
}

interface ThicknessFieldProps {
  value: number;
  onChange: (value: number) => void;
}

// input for editing the thickness of the selected wall
function ThicknessField({ value, onChange }: ThicknessFieldProps) {
  return (
    <input
      type="number"
      step="0.05"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{
        width: '100%',
        padding: '6px 8px',
        border: '1px solid #ccc',
        borderRadius: 4,
        boxSizing: 'border-box',
        background: '#ffffff',
      }}
    />
  );
}

export function SidePanel({ walls, selectedId, onSelect, onThickness }: SidePanelProps) {
  const selected = walls.find((w) => w.id === selectedId);

  return (
    <div className="panel">
      <h2>Walls</h2>
      <div>
        {walls.map((w, i) => (
          <div
            key={i}
            className={w.id === selectedId ? 'row selected' : 'row'}
            onClick={() => onSelect(w.id)}
          >
            {w.id} — {w.length.toFixed(1)} ft
          </div>
        ))}
      </div>
      {selected && (
        <div>
          <div className="field-label">LENGTH</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
            {selected.length.toFixed(1)} ft
          </div>
          <div className="field-label">THICKNESS (FT)</div>
          <ThicknessField
            value={selected.thickness}
            onChange={(thickness) => onThickness(selected.id, thickness)}
          />
        </div>
      )}
    </div>
  );
}
