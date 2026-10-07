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

## Feature: T-junction Snapping (Upcoming)
- Snap dragged endpoint to nearest point on another wall's centerline within 12 screen pixels.
- Endpoint-to-endpoint snap must take precedence.
- Wall being dragged never snaps to itself.

---

## Other Codebase Observations (Noticed, but left untouched)
*(To be detailed as we progress)*
