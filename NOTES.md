# Engineering Notes — Floor Plan Editor

## 1. Engineering Workflow & AI Collaboration

As encouraged by the prompt, AI tooling was leveraged as an accelerator. However, the engineering process was strictly human-led, applying senior-level architectural discipline, empirical verification, and systematic triage:

1. **Structured Triage & Risk-Weighted Decomposition**:
   - Rather than jumping haphazardly between tasks, the work was planned and executed in progressive order: **T3 (DOM lifecycle stability) → T2 (CSS cascade & specificity) → T1 & Feature (Geometry & Screen Coordinate Math)**.
   - Resolving localized component state and layout anomalies first established a stable baseline before tackling complex 2D geometric vector calculations.

2. **Empirical Discipline ("Replicate Before Fixing")**:
   - Enforced a strict verification-first standard: every reported ticket had to be deterministically reproduced in the running application and inspected at the DOM/CSS level before writing any code.

3. **Architectural Steering & Root-Cause Precision (T3)**:
   - Guided the investigation beyond surface-level symptoms ("re-render"), pinpointing the exact mechanism: **inner component declaration causing reference churn across renders, triggering React Fiber unmount/mount cycles and destroying DOM node state**.
   - Rather than settling for a crude in-place hack, directed the architecture toward an isolated, top-level `ThicknessField` component with clean props (`value`, `onChange`), ensuring zero focus churn and making it immediately reusable as an extracted design system / UI library primitive.

4. **Pragmatic Tradeoff Evaluation (T2)**:
   - Evaluated the tension between theoretical component CSS scoping and QA's specific acceptance criteria (*"edits to Editor.css don't seem to have any effect on it"*).
   - Executed the surgical resolution that immediately satisfies QA's test harness, while documenting architectural recommendations for scoped styling / CSS modules for long-term health.

5. **Clean Version Control Hygiene**:
   - Initialized a clean repository baseline with a dedicated initial commit (`837dc06`), followed by isolated, semantic atomic commits per ticket (`daf308d` for T3, `7000dcb` for T2) to ensure transparent, line-by-line reviewability during the walkthrough call.

---

## 2. Bug Fixes & Technical Analysis

### Ticket T3: Thickness Input Focus Loss on Keystroke
- **Symptom**: Typing into the thickness input field dropped DOM focus and cursor selection after every single keystroke.
- **Root Cause**:
  `ThicknessField` was declared as a nested functional component inside the `SidePanel` body:
  ```tsx
  export function SidePanel(...) {
    const ThicknessField = () => <input ... />;
    return <ThicknessField />;
  }
  ```
  On every keystroke, `onThickness` triggered a state update in the parent (`App`), re-rendering `SidePanel`. Each render allocated a brand-new function reference for `ThicknessField` on the heap (`prevType !== nextType`). React's reconciliation engine interpreted this as a completely different component type, unmounting the existing `<input>` DOM node and mounting a new one, destroying browser focus and text selection.
- **Surgical Solution**:
  Extracted `ThicknessField` to top-level scope as a pure component accepting explicit props (`value: number`, `onChange: (val: number) => void`):
  ```tsx
  interface ThicknessFieldProps {
    value: number;
    onChange: (value: number) => void;
  }

  function ThicknessField({ value, onChange }: ThicknessFieldProps) {
    return <input ... />;
  }
  ```
  This guarantees a stable component identity across parent renders, completely eliminating focus loss while keeping the component decoupled and testable.
- **Commit**: `daf308d` — `fix(sidepanel): resolve focus loss on thickness input (T3)`

---

### Ticket T2: Side Panel Styling & `Editor.css` Cascade Ineffectiveness
- **Symptom**: The side panel appeared visually cramped (240px width, 4px padding, `#ececec` dark gray background), and changes made to `.panel` in `Editor.css` had no effect on the UI.
- **Root Cause**:
  Two competing layers of style overrides prevented `Editor.css` from taking effect:
  1. **Inline Style Specificity**: `<div className="panel" style={{ background: '#ececec', paddingTop: 6 }}>` in `SidePanel.tsx` had the highest CSS specificity, completely overriding any stylesheet definitions for background and padding.
  2. **Stylesheet Shadowing**: `SidePanel.css` duplicated `.panel` and `.panel h2` rules with lower-quality styles (`width: 240px`, `#e4e4e4`, `padding: 4px`), which cascaded over the intended rules in `Editor.css`.
- **Surgical Solution**:
  1. Removed the inline style from `SidePanel.tsx`, reverting to `<div className="panel">`.
  2. Removed redundant `.panel` and `.panel h2` rules from `SidePanel.css`, retaining only `.field-label`.
  3. Restored the intended clean white layout (`width: 280px`, `background: #ffffff`, `padding: 16px`) defined in `Editor.css`, allowing future edits in `Editor.css` to immediately take effect.
- **Commit**: `7000dcb` — `fix(sidepanel): resolve styling conflict and restore Editor.css effect (T2)`

---

## 3. In-Progress & Next Milestones

- **Ticket T1**: Snapping scale-invariance (converting endpoint snap threshold from fixed world units to screen pixels).
- **New Feature**: T-junction snapping (12 screen pixels threshold, projection onto wall centerline, endpoint priority precedence, drag-self exclusion).
- **Codebase Observations**: Documenting secondary code smells (stale `w.length`, array index keys, loose `any` typing, geometry edge cases) discovered during audit.
