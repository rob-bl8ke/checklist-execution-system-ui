---
name: ui-ux-guidelines
description: >
  Project-specific UI/UX policy for the Checklist Execution System UI. Use when
  designing or reviewing Angular components, layouts, interactions, and
  accessibility. This skill supplements the installed `web-design-guidelines`
  skill (Vercel Labs) — that covers general web accessibility, layout, and
  interaction quality. This skill owns only project-specific visual and
  interaction rules for this engineer productivity tool.
---

# UI/UX Policy — Checklist Execution System UI

## When to Use This Skill

Use this skill when:
- Designing or reviewing Angular component templates and layouts
- Applying Tailwind CSS classes or Angular Material components
- Implementing interactive patterns (drag-drop, confirmation dialogs, toasts)
- Reviewing accessibility compliance for keyboard-first workflows
- Deciding motion, animation, or transition behaviour

For general web accessibility, semantic HTML, and layout fundamentals, defer to
the installed `web-design-guidelines` skill first.

---

## Design Principles

This is a **calm, dense-but-readable productivity tool for engineers** — not a marketing app.

1. **Minimal friction** — every interaction should serve execution, not aesthetics
2. **Information hierarchy** — the current step and active run always dominate the view
3. **Explicit feedback** — every mutation (complete, create, delete) gets visible confirmation
4. **Keyboard-first** — all core workflows operable without a pointing device
5. **No surprises** — destructive actions require confirmation; state changes are visible

---

## Visual System

### Spacing and Layout

- Use Tailwind spacing scale consistently: `p-4`, `gap-4`, `space-y-2`, etc.
- Page layout: max-width container `max-w-4xl mx-auto px-4`
- Card/panel spacing: `p-4 rounded-lg border`
- Section headings: `text-lg font-semibold` with `mb-4` separator

### Typography

- Body text: `text-sm text-gray-700` (or equivalent token)
- Code/monospace: `font-mono text-sm bg-gray-100 rounded px-1`
- Labels and metadata: `text-xs text-gray-500`
- Headings hierarchy: `text-xl` (page), `text-lg` (section), `text-base` (card title)

### Color Usage

- Primary actions: Angular Material azure-blue (`mat-primary`)
- Destructive actions: `text-red-600` / `bg-red-50` with explicit warning label
- Completed/success state: `text-green-600` / `bg-green-50`
- Disabled/inactive: `text-gray-400`
- Do not use color alone to convey state — always pair with text or icon

### Surface Hierarchy

```
App shell background: bg-gray-50
Card / panel:         bg-white border border-gray-200 rounded-lg
Active / selected:    bg-blue-50 border-blue-300
```

---

## Shell and Navigation

- Fixed sidebar or top nav with 4 links: Today, Runs, Templates, Todos
- Active link visually distinguished (bold + color accent — not just underline)
- Mobile: collapsible nav or bottom tab bar (stretch goal)
- Today is always the default landing page — it must be immediately usable

---

## Page Patterns

### Today Dashboard

- Run cards stacked vertically, each showing: run name, step number/total, step title, rendered instructions snippet
- `[Complete]` button on each card — primary action, prominent
- `[Open]` link to full run execution screen
- Incomplete todos listed below run cards: checkbox + label, no extra chrome
- Empty state: "No active runs. Start one from Templates." with a CTA link

### Run Execution Screen

- Progress bar at top: `X of Y steps complete`
- Step list: completed steps have checkmark + muted style; active step expanded
- Expanded step shows: title, full rendered markdown, `[Mark Complete]` button, optional notes
- Collapsing/expanding steps is animated (optional, respect `prefers-reduced-motion`)
- `[Mark Complete]` auto-advances to next step

### Template Editor

- Step list with visible drag handles (☰ icon) on the left
- Click step row to expand inline editor (title + markdown instructions + preview)
- `[Add Step]` button at bottom of list
- `[Delete Template]` is a destructive action — requires confirmation dialog

### Todo List

- Inline add: text input at top, `Enter` to submit
- Checkbox to complete, strikethrough on completed text
- `[Delete]` icon appears on hover/focus
- No pagination for V1 — show all incomplete at top, completed below (or toggle to hide)

---

## Forms and Feedback

- Validation errors shown inline beneath the field, not in a toast
- Required fields marked — do not rely on placeholder text as label
- Submit button disabled while form is invalid or a request is in flight
- Optimistic updates only for low-risk mutations (todo toggle); confirmed updates for destructive or complex operations
- Toast (`MatSnackBar`) for success/error notifications — 3–4 second auto-dismiss
- Confirmation dialog (`MatDialog`) required before: deleting a template, deleting a todo, abandoning a run

---

## Markdown Presentation

- Rendered in `ngx-markdown` with Prism.js syntax highlighting
- Code fences: dark background (`bg-gray-900 text-gray-100`), monospace font, `[Copy]` button top-right
- The `[Copy]` button uses `navigator.clipboard.writeText()` and shows `Copied!` feedback for 2 seconds
- Max width on rendered blocks to preserve readability: `prose max-w-none`
- Do not allow raw HTML injection through markdown — use `ngx-markdown` safe mode

---

## Drag-Drop (Step Reordering)

- Drag handle is a dedicated `☰` icon — not the whole row
- Drop target shows a visible placeholder line during drag
- After drop: call the move-step API; optimistically reorder the list; revert on error
- Keyboard alternative: arrow buttons or accessible `Move Up / Move Down` controls
- Do not use drag-drop on mobile without also providing a tap-based reorder UI

---

## Accessibility Rules

- All interactive elements reachable via `Tab` in logical order
- Visible focus rings — never `outline: none` without a replacement
- `aria-label` on icon-only buttons (`[Copy]`, `[Delete]`)
- `role="status"` or `aria-live="polite"` on loading and success feedback regions
- Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text (WCAG AA)
- Step complete/incomplete state communicated both visually (checkmark/muted color) and via `aria-checked` or `aria-label`

---

## Motion Rules

- Step expand/collapse: subtle height transition (`transition-all duration-150`)
- Step completion: checkmark fade-in only
- Toast entry: slide-in from bottom
- **Always respect `prefers-reduced-motion`** — wrap non-essential transitions in:

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

No parallax, no entrance animations on page load, no looping animations.

---

## Anti-Patterns

- No marketing-style hero sections, gradients, or decorative illustrations
- No over-animated interactions (no bounce, spring, or stagger on list items)
- No low-contrast placeholder text used as the only label
- No destructive actions without a confirmation step
- No toast-only validation errors — always show inline
- No spinner-only loading states without meaningful context text

---

## Definition of Done (per UI feature)

- [ ] Tailwind utility classes used for layout and spacing (not inline styles)
- [ ] Loading and empty states handled in template
- [ ] Destructive actions behind confirmation dialog
- [ ] All interactive elements keyboard-accessible with visible focus
- [ ] Color not used as the sole state indicator
- [ ] `prefers-reduced-motion` respected for all transitions
- [ ] `aria-label` on icon-only buttons
- [ ] Code blocks in rendered markdown have `[Copy]` button
