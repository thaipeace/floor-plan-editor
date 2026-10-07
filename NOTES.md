# Floor Plan Editor — Development Notes

## Overview & Discovery
A lightweight React + TypeScript 2D floor plan editor with SVG rendering, viewport transforms, and a side panel.
I reviewed the codebase structure, ran the dev server to explore the UI, and prioritized tasks from low-risk to complex: UI stability first (T3 → T2), followed by geometry math (T1 → T-junction feature).

---

## Ticket T3: Thickness Input Drops Focus

### What was broken & Why
Typing in the thickness field dropped focus after every keystroke. `ThicknessField` was declared inside `SidePanel`, meaning a new function reference was created on every render. React's reconciliation saw a changed component type (`prevType !== nextType`), completely unmounting the DOM `<input>` and mounting a new one, which destroyed browser focus and cursor position.

### How I drove the process & worked with AI
1. **Replicate first**: Before touching any code, I asked AI to provide exact steps to reproduce the bug in the browser so I could inspect the behavior myself.
2. **Deep-dive on the mechanism**: When AI briefly mentioned a "re-render", I challenged it: *where exactly is it being destroyed?* This led to the exact explanation of React Fiber unmounting the DOM node rather than a normal re-render update.
3. **Architectural direction**: When AI offered a simple inline fix, I challenged the design: *what if we want to extend this or extract it into a UI library later?* I directed AI to implement Option 2: extracting `ThicknessField` outside `SidePanel` as a standalone component with explicit props (`value`, `onChange`).
4. **Result**: Input retains focus smoothly on every keystroke, and the component is now modular and testable.

---

## Ticket T2: Side Panel Styling & `Editor.css` Edits Ignored

### What was broken & Why
The side panel was visually cramped (240px wide, 4px padding, dark gray `#ececec`), and edits to `Editor.css` had no visual effect. Two things caused this:
1. An inline style `<div className="panel" style={{ background: '#ececec', paddingTop: 6 }}>` in `SidePanel.tsx` overrode external CSS due to highest specificity.
2. `SidePanel.css` duplicated `.panel` and `.panel h2` rules, shadowing `Editor.css`.

### How I drove the process & worked with AI
1. **Empirical verification**: I tested editing `Editor.css` and verified in DevTools that inline styles and duplicate CSS files were overriding the rules.
2. **Architectural debate**: AI suggested change style on `Editor.css` I challenged AI proposing to consolidate everything into `SidePanel.css` for better component scoping. We debated the tradeoff: QA specifically expected edits in `Editor.css` to take effect. I made the call to go with the surgical fix to satisfy QA's acceptance test directly, while logging the scoped styling recommendation as future tech debt.
3. **Result**: Removed inline styles in `SidePanel.tsx` and purged duplicate rules from `SidePanel.css`. The panel now displays the clean 280px white layout from `Editor.css`, and edits to `Editor.css` take effect immediately.

---

## Ticket T1: Snapping Scale-Invariance & Extreme Zoom Handle UX

### What was broken & Why
Snapping was measured using a fixed world-space constant `SNAP_DIST = 0.5` feet. When zoomed out (e.g. scale = 5), the snap radius on screen shrank to 2.5px — much smaller than the physical cursor arrow (16–24px) and smaller than mouse acceleration jumps, making triggering snap nearly impossible. Conversely, when zoomed in, the world-space threshold ballooned into dozens of screen pixels. Furthermore, the starter loop greedily overwrote the snap target based on array order rather than picking the nearest candidate.

### How I drove the process & worked with AI
1. **Deconstructed the coordinate spaces**: Identified that snapping is a human-computer interaction (HCI) affordance that must be evaluated in screen pixels (`12px`), converting world distance via `dist * viewport.scale < SNAP_PIXELS`.
2. **Nearest-candidate algorithm**: Challenged the old greedy array loop and directed the implementation to find the true minimum-distance candidate (`minDistance`), resolving ambiguity when multiple endpoints are near the cursor.
3. **Discovered & challenged extreme zoom anomaly**: While testing at 25x zoom, I noticed that snapping felt unresponsive. I identified the root cause: the visual handle circle had a fixed world radius (`r = 0.35 ft`), which ballooned to over 100px wide when zoomed in, creating an optical illusion where the mouse was visually inside the circle but still outside the 12px center threshold.
4. **Architected the Invisible Hitbox UX**: Rather than inflating the snap threshold (which would break the 12px spec and interfere with T-junction snapping), I directed standard CAD interaction patterns:
   - Kept the visual handle at a constant, elegant 8 screen pixels (`8 / viewport.scale`).
   - Added an expanded transparent hitbox (`Math.max(thickness / 2 + 0.1, 18 / viewport.scale)`) with `cursor: 'grab'`.
5. **Result**: Clicking and grabbing handles is effortless at every zoom level without requiring sniper-like mouse aim, and snapping operates with crisp 12px tactile precision.

---

## Feature: T-junction Snapping

### Requirement & Design
Allows a dragged wall endpoint to snap onto the centerline of another wall within 12 screen pixels, forming a T-junction.

### How I drove the process & worked with AI
1. **Geometric Vector Projection**: Directed extracting the projection logic into a pure mathematical utility `closestPointOnSegment(p, a, b)` in `geometry.ts`. It projects point `p` onto segment `[a, b]`, clamps `t` to `[0, 1]`, and safely handles zero-length segments (`lenSq === 0`) to prevent division-by-zero `NaN` bugs.
2. **Two-Phase Precedence Architecture**: Enforced a strict two-phase pipeline in `Editor.tsx`:
   - *Phase 1*: Search for the nearest endpoint of other walls within 12 screen pixels.
   - *Phase 2*: Only if no endpoint is found in range, search for the nearest centerline point within 12 screen pixels.
   - This architectural separation guarantees that endpoint snapping unconditionally wins when both are in range.
3. **Self-Snapping Exclusion**: Ensured `w.id === drag.id` is excluded across both phases so a wall cannot snap to itself.
4. **Test-Driven Verification**: Expanded `geometry.test.ts` with 5 new unit tests covering horizontal, vertical, clamped projections, and zero-length degenerate cases (100% pass rate).
5. **Result**: Validated in the browser across multiple zoom levels. Moving endpoints along intersecting walls glides smoothly along centerlines and snaps cleanly into corners when approaching endpoints.

---

## Other Codebase Observations (Noticed, but left untouched)

Per the ground rules to keep changes surgical and avoid rewriting the app, I cataloged the following code smells and potential improvements:

1. **Stale `w.length` on Endpoint Movement (`App.tsx`)**:
   `handleMoveEndpoint` updates `start` or `end`, but does not recalculate `w.length`. Consequently, the length readout in `SidePanel` becomes stale as walls are edited. Left untouched to avoid altering the state contract unexpectedly.
2. **Array Index as React Key (`Editor.tsx` & `SidePanel.tsx`)**:
   Both components render wall lists using `key={i}` instead of `key={w.id}`. If walls are deleted, added, or reordered in the future, this could cause rendering anomalies.
3. **Pervasive `any` Typing on Events (`Editor.tsx` & `App.tsx`)**:
   Pointer and wheel events are typed as `(e: any)`, and API fetch uses `(data: any)`. Replacing these with `React.PointerEvent<SVGSVGElement>` and explicit schema interfaces would improve type safety.
4. **Missing Pointer Capture on SVG (`Editor.tsx`)**:
   Endpoint dragging relies on SVG `onPointerMove`. Fast cursor sweeps out of the browser viewport can lose track of drag events. Using `setPointerCapture` or a global window listener would improve dragging robustness.
5. **Duplicate Distance Utilities (`geometry.ts`)**:
   `geometry.ts` exports both `dist(a: Point, b: Point)` and `distance(x1, y1, x2, y2)`. Consolidating onto `dist` would reduce API redundancy.
