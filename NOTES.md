# Floor Plan Editor — Development Notes

## Overview
A lightweight React + TypeScript app for view and edit 2D floor plans using SVG.
I approach the task in a straightforward, practical order:
1. Fix the UI issues first so testing in browser is pleasant (T3 → T2).
2. Fix the coordinate math for endpoint snapping (T1).
3. Implement the T-junction snapping feature and back it with unit tests.

Here is a breakdown of what was broken, how I worked through it with AI, and the solutions we implemented.

---

## Ticket T3: Thickness Input Drops Focus on Every Keystroke

### What was broken & Why
Whenever click on thickness input and type a number, the cursor immediately disappeared and the input lost focus after a single keystroke.

The cause: `ThicknessField` was define *inside* the `SidePanel` component function. On every re-render (triggered by typing), JavaScript created a brand new function reference for `ThicknessField`. React saw this as a completly different component type, so during reconciliation it threw away the existing DOM `<input>` element and created a new one from scratch. That unmount wiped out the browser's focus state and cursor position.

### How I worked with AI
1. I reproduce the issue in browser and asked AI to explain me why an `<input>` would lose focus on every keystroke in React.
2. AI explained the component re-creation issue. It offered a quick inline `<input>` replacement, but I wanted to keep the code neat and readable.
3. I asked AI to extract `ThicknessField` outside `SidePanel` as a standalone component with clear props (`value` and `onChange`).
4. Result: Typing is smooth, focus stay in place, and the fix is clean and isolated.

---

## Ticket T2: Side Panel Styling

### What was broken & Why
The side panel looked cramped, and edits doesn't have any visual effect. I easily noticed that panel styles were being overridden twice:
1. `SidePanel.tsx` had an inline style: `<div className="panel" style={{ background: '#ececec', paddingTop: 6 }}>` which override external CSS due to highest specificity.
2. `SidePanel.css` had duplicate `.panel` rules that conflict with `Editor.css`.

### How I fixed it
I check in Chrome DevTools, removed the inline style from `SidePanel.tsx`, and moved all `.panel` styles from `Editor.css` into `SidePanel.css` so component styling is clean and properly organized in one place.

Result: The panel now displays the clean 280px layout, and all panel styles are neatly located in `SidePanel.css`.


---

## Ticket T1: Snapping at Different Zoom Levels

### What was broken & Why
Snapping worked fine when zoomed in, but was nearly impossible to trigger when zoomed out.

The cause: The snap treshold was hardcoded in world-space coordinates as `SNAP_DIST = 0.5` feet. When zoomed out (e.g. scale = 5), 0.5 feet is only 2.5 screen pixels—much smaller than the mouse cursor itself, so you have to hit an impossibly tiny target. When zoomed in (e.g. scale = 28), 0.5 feet became 14 screen pixels. Also, the original loop just picked whichever endpoint came last in array order rather than the closest one.

### How I worked with AI
1. I discuss with AI about coordinate system: snapping is a mouse-aiming affordance, so it should be evaluated in **screen pixels** (12px), not world feet. We converted the distance check to: `dist(p, endpoint) * viewport.scale < SNAP_PIXELS`.
2. I had AI update the loop to track `bestEndpointDistPx` so it reliably chooses the nearest endpoint instead of whatever was last in the array.
3. While testing at high zoom levels (e.g. 25x), I noticed clicking and dragging handles felt awkward because the handle circle either grew huge or was too small to grab comfortably. We seperated the handle into two parts:
   - A crisp visual circle (`8 / viewport.scale`) that always looks neat.
   - An invisible, generous hitbox circle with `cursor: grab` so grabbing endpoints is easy and forgiving at any zoom level.
4. Result: Snapping feels crisp and consistent at 12 screen pixels across all zoom levels.

---

## Feature: T-Junction Snapping

### Requirement
When drag a wall endpoint near another wall's centerline (within 12 screen pixels), snap it onto the nearest point of that centerline. Endpoint-to-endpoint snapping must still win if both are in range, zoom level shouldn't affect it, and a wall should never snap to itself.

### How I worked with AI
1. **Math utility**: I asked AI to write `closestPointOnSegment(p, a, b)` in `src/utils/geometry.ts`. We made sure it:
   - Projects point `p` onto the line segment `[a, b]` using vector dot product.
   - Clamps the scalar `t` to `[0, 1]` so it stays on the segment.
   - Handles zero-length walls (`lenSq === 0`) safely to avoid `0 / 0 = NaN`.
2. **Two-phase logic in `Editor.tsx`**:
   - **Phase 1**: Look for the closest endpoint within 12 screen pixels.
   - **Phase 2**: If (and only if) no endpoint is in range, look for the closest centerline point within 12 screen pixels.
   - This strict two-phase structure guarantees that endpoint snapping unconditionally beats centerline snapping without messy tie-breaking logic.
   - Both phases exclude `w.id === drag.id` so a wall never snaps to itself.
3. **Unit testing**: We added unit tests in `src/utils/geometry.test.ts` covering horizontal, vertical, clamped projections, and the zero-length edge case. All 6 tests are pass.
4. Result: Dragging an endpoint glides smoothly along intersecting walls and snaps cleanly into corners when approaching endpoints.

---

## Other Things I Noticed (Left untouched)

In keeping with instruction to make surgical changes and avoid rewrites:
1. **Array index used as React key (`Editor.tsx`, `SidePanel.tsx`)**: Walls are rendered with `key={i}` instead of `key={w.id}`. If walls are ever added, removed, or reordered, this could cause rendering glitches.
2. **`w.length` isn't recalculated on drag (`App.tsx`)**: When endpoints move, `handleMoveEndpoint` updates `start` or `end`, but leaves `w.length` unchanged. The length display in side panel become stale.
3. **Mouse drag can lose track when leaving SVG (`Editor.tsx`)**: Dragging relies on `onPointerMove` on the SVG element. Rapid mouse movements outside the window can drop the drag. Using `setPointerCapture` will make it more robust.

