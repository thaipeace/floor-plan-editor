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
3. **Architectural direction**: When offered a simple inline fix, I challenged the design: *what if we want to extend this or extract it into a UI library later?* I directed AI to implement Option 2: extracting `ThicknessField` outside `SidePanel` as a standalone component with explicit props (`value`, `onChange`).
4. **Result**: Input retains focus smoothly on every keystroke, and the component is now modular and testable.

---

## Ticket T2: Side Panel Styling & `Editor.css` Edits Ignored

### What was broken & Why
The side panel was visually cramped (240px wide, 4px padding, dark gray `#ececec`), and edits to `Editor.css` had no visual effect. Two things caused this:
1. An inline style `<div className="panel" style={{ background: '#ececec', paddingTop: 6 }}>` in `SidePanel.tsx` overrode external CSS due to highest specificity.
2. `SidePanel.css` duplicated `.panel` and `.panel h2` rules, shadowing `Editor.css`.

### How I drove the process & worked with AI
1. **Empirical verification**: I tested editing `Editor.css` and verified in DevTools that inline styles and duplicate CSS files were overriding the rules.
2. **Architectural debate**: I challenged AI proposing to consolidate everything into `SidePanel.css` for better component scoping. We debated the tradeoff: QA specifically expected edits in `Editor.css` to take effect. I made the call to go with the surgical fix to satisfy QA's acceptance test directly, while logging the scoped styling recommendation as future tech debt.
3. **Result**: Removed inline styles in `SidePanel.tsx` and purged duplicate rules from `SidePanel.css`. The panel now displays the clean 280px white layout from `Editor.css`, and edits to `Editor.css` take effect immediately.

---

## Ticket T1: Snapping Scale-Invariance (In Progress)
- **Current status**: Replicated the issue. Snapping works when zoomed in, but fails when zoomed out because `SNAP_DIST = 0.5` is in world units (feet). At scale 100, snap radius is 50px (very easy); at scale 5, snap radius is 2.5px (almost impossible to hit).
- **Next step**: Convert snap distance to screen pixels (12px) so snapping feels identical at every zoom level.

---

## Feature: T-junction Snapping (Upcoming)
- Snap dragged endpoint to nearest point on another wall's centerline within 12 screen pixels.
- Endpoint-to-endpoint snap must take precedence.
- Wall being dragged never snaps to itself.

---

## Other Codebase Observations (Noticed, but left untouched)
*(To be detailed as we progress)*
