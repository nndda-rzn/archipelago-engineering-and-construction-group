# Workflow Page — Chain Workspace Redesign

> Design spec. Branch: `feature/workflow-workspace-redesign`.
> Requirement: rebuild the Workflow page (`/workflows`) around the work it actually
> does — editing an ordered approval chain — and stop presenting an ordered list as
> a 2D canvas.

## 1. Correction: the canvas was the wrong shape

An earlier iteration of this work put the chain on a react-flow canvas. That was a
**category error**, and it was reverted.

The skill reference defines a canvas as *"an infinite 2D workspace where users can
freely place, move, and manipulate objects"* (Figma, Miro, maps). An approval chain
is the opposite: **linear and ordered**. The canvas code proved the mismatch on its
own terms —

- node positions were forced onto a vertical grid (`y = FIRST_STEP_Y + index * Y_GAP`);
- after a drop, nodes snapped back to that grid — dragging only ever meant reorder;
- pan, zoom and a minimap were shipped for a two- or three-step chain that always
  fits on screen.

So a 2D engine (pan, zoom, minimap, node graph, connection handles) was installed to
draw a list. The cost was real: a new dependency, **174.8 kB JS + 15.5 kB CSS**, two
jsdom polyfills (`ResizeObserver`, `DOMMatrixReadOnly`) that existed only for the
canvas, ~460 lines of code, and a fragile keyboard story (buttons inside a
transformed viewport).

The honest fix is not a better canvas. It is a **list**.

## 2. What the page is for

Five tasks, and nothing else: see the order · edit a step · change the order ·
simulate the path · understand the rules. All five are served by one editable
ordered list.

## 3. Layout

```
┌───────────────┬─────────────────────────────────────┬─────────────────┐
│ Definitions   │ Approval chain         [+ Add step] │ Inspector       │
│  260px        │ ⠿ ① Procurement manager      [↑][↓] │ step form       │
│  search       │     PROCUREMENT_MANAGER · 👤 Admin  │ simulate        │
│  [+New][Tmpl] │ ⠿ ② Board approval           [↑][↓] │                 │
│  ▾ PR_APPROVAL│     SUPER_ADMIN · 👤👤 Admin, CFO   │                 │
│    ● v2 Active│     ╭ Estimated total > Rp 5.000.000 ╮│                │
│      v3 Draft │ ⚠ ③ Finance review                  │                 │
│      v1 Archiv│     No approver, so the chain…      │                 │
│  ▾ PO_APPROVAL│ ── submitted ──  ── approved ──      │                 │
│               │ ▸ Insights  ▸ Versions  ▸ Settings  │                 │
└───────────────┴─────────────────────────────────────┴─────────────────┘
```

One dominant element (the chain). The inspector keeps the selected step beside it.
Insights, versions and settings collapse into a drawer that is closed by default.

## 4. Zone 1 — definitions rail, grouped by code

`PR_APPROVAL` v3/v2/v1 are not three workflows; they are one workflow with a
history. A flat list made them look like siblings, so the eye could not tell which
one is in use. The rail now groups by `code`:

- Group header: code (mono) + transaction type (`PR`/`PO`), collapsible.
- Inside: one row per version — active dot, version, status, and **coverage**.
- **Coverage** (`holders present / total steps`) answers the question a user
  actually has when picking a workflow: *can this chain run?* Always with an icon
  and text, so colour is never the only signal.
- Hierarchy by weight, not by new colours: the ACTIVE version is bold with a filled
  dot; DRAFT is secondary; ARCHIVED recedes.
- Status badges were dropped here on purpose: three badges per row erased the
  hierarchy. Status is plain text whose weight follows its importance.

## 5. Zone 2 — the chain list

`<ol>`, semantic and ordered.

- **Two equal ways to reorder**: a drag handle (mouse) and up/down buttons
  (**required** — WCAG 2.5.7 forbids an action that is drag-only). `Alt` + arrow on
  the handle is a third, keyboard-native path. All call the existing reorder endpoint.
- Nodes show order, name, role, holders **as people** (avatar stack), and the
  condition as a chip.
- Colour is never the only signal: a step with no holder carries an icon and text;
  a step skipped by simulation is dimmed **and** says so in its `aria-label`.
- Reorder controls live in the list only. The inspector's duplicate Move up/down
  buttons were removed — two controls with the same name in two panels is an
  accessibility fault (WCAG 2.4.6), not a convenience.

## 6. Zone 3 — insights, four tiers

The insights panel had eight equal-weight blocks in a row: no hierarchy, and the
same data rendered two or three times (thresholds appeared three times, coverage
twice). It is now tiered, and the duplicates are gone.

| Tier | Block | Question | Shape |
|---|---|---|---|
| 1 | Coverage · documents · approval rate | is the chain healthy? | ring + big numbers |
| 2 | Where documents go | **where do documents drop out?** | funnel |
| 3 | Outcome by step · value distribution | what happened, how big? | stacked bar · histogram + thresholds |
| 4 | Rule impact | how many hit each rule? | proportion bar |

The funnel is the primary visual because "where do documents stop" is the core
question about a chain — a ranked bar answers "which is biggest", not that.

Corrections made along the way:

- hex literals in the chart components replaced with `chart-colors` tokens (the file
  claimed zero hex while containing three);
- proportions that were written as sentences are now bars;
- fixed-width numeric columns (`w-14`, `w-28`, `w-40`) became `min-w-*` — a fixed
  width truncates a long number;
- the duplicate threshold list and its trailing prose were deleted; the information
  survives as the threshold lines already drawn on the histogram.

## 7. Text policy (applied across the zones)

| Content | Treatment |
|---|---|
| h1–h3 | `text-balance` (project convention in `globals.css`) |
| Paragraphs | `text-pretty`, max width |
| Step / version / definition names | `truncate` + `min-w-0` + `title` |
| Numbers and currency | `tabular-nums whitespace-nowrap` |
| Role codes | `whitespace-nowrap` |
| Condition chips | `whitespace-nowrap truncate` |
| Fixed numeric columns | `min-w-*` + `shrink-0` |

A concrete bug fixed: the versions rail had `truncate` on a flex child with no
`min-w-0`, so a long name **pushed the badges out** instead of ellipsing.

## 8. Testing

Behaviour is asserted, not markup: DRAFT/ACTIVE rules, mutations, reorder payloads,
simulation paths, preflight, grouping, coverage, funnel stages, drawer tabs,
template creation, duplication. Drag is exercised through the button path — the
mandatory non-drag equivalent — because jsdom has no native drag-and-drop.

## 9. Result

- −2 components (canvas, canvas node), −1 dependency, −174.8 kB JS / −15.5 kB CSS
- −2 test polyfills that existed only for the canvas
- 8 insight blocks → 4 tiers, with the duplication removed
- zero hex literals in the workflow chart components
- the page now shows a list for a list
