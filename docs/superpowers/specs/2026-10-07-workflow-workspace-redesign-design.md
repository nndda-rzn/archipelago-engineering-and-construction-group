# Workflow Page — Canvas Workspace Redesign

> Design spec. Branch: `feature/workflow-workspace-redesign`.
> Requirement: rebuild the Workflow page (`/workflows`) as a workspace where the
> approval chain is the interface, add the functionality the page was missing,
> and fix the shapes of its analytics.

## 1. Problem

The page had grown into five equal-weight vertical zones (identity, metadata,
chain + editor + simulate, versions, insights) stacked in one scroll. Measured
against the project's own design rules, that produced four concrete faults:

1. **No dominant element.** Canvas, editor, versions and insights all competed.
2. **Shape did not encode meaning.** The chain, the version history and the
   insights were all sequences of text; a reader had to parse prose to see a
   process.
3. **The product was subordinate to its form.** The chain — the thing being
   designed — sat below a metadata form, and the Flow/Table toggle was buried.
4. **The domain concept was invisible.** DRAFT → ACTIVE appeared only as a
   badge; nothing showed where a definition sat or what the next step was.

Two functional gaps compounded this: there was no drag-to-reorder, no way to
duplicate a definition, no template to start from, no preview of publish
problems, and simulation handled a single amount at a time.

## 2. What was built

### 2.1 Layout: canvas hero + inspector + drawer

```
┌────────────┬───────────────────────────────────────────┬────────────┐
│ Definitions│ Toolbar  [Canvas│Table]        + Add step   │ Inspector  │
│  260px     ├───────────────────────────────────────────┤  320px     │
│  search    │                                           │ step form  │
│  + create  │   CANVAS — the approval chain             │ simulate   │
│  + template│   (submit) → ① → ② ┄┄ ③ → (approved)      │            │
│  ● PR v3   │   drag to reorder · minimap · zoom        │            │
│  ○ PR v2   ├───────────────────────────────────────────┤            │
│            │ ▸ Insights   ▸ Versions   ▸ Settings       │            │
└────────────┴───────────────────────────────────────────┴────────────┘
```

One dominant element (the canvas). The inspector keeps the selected step beside
it so editing never moves the chain off screen. Insights, versions and settings
collapse into a drawer that is **closed by default**, so the canvas gets the
height and the page is no longer a five-zone scroll.

### 2.2 Lifecycle strip

Draft → Publish → Active, with the Publish action attached to its own stage
rather than floating in a button row. `ARCHIVED` is a terminal branch shown
separately. This is what makes the domain rule visible instead of implied.

### 2.3 Canvas

`@xyflow/react`. Layout is **forced vertical**: an approval chain is ordered, so
letting nodes be placed freely would misrepresent the sequence. Dragging
therefore **changes order**, not position — and it reuses the existing
`POST /workflows/:id/steps/reorder` endpoint, so no new backend surface.

- Conditional edges are dashed; solid edges always run.
- Nodes show order, name, role, the holders **as people** (avatar stack), and
  the condition as a chip.
- Colour is never the only signal: a step with no holder carries an icon and
  text; a skipped step is dimmed **and** says so in its `aria-label`.
- Keyboard: nodes are real `<button>`s, arrow keys move between them, and the
  inspector's Move up/down is the keyboard equivalent of dragging.
- The **Table view remains** as the accessible counterpart of the canvas,
  consistent with the dashboard's existing "canvas always has a table" rule.

### 2.4 Preflight before publish

`lib/preflight.ts` computes blockers and warnings from data already loaded:
no steps, unknown role, role with no holder, empty name, incomplete condition,
non-positive threshold, consecutive same role. The publish dialog lists them and
each item jumps to the offending step. The server still decides; this only moves
the discovery to where the problem is.

### 2.5 Duplicate and templates

- `POST /approvals/workflows/:id/duplicate` copies a definition and its steps
  into a new DRAFT at version 1, with an audit entry.
- `GET /approvals/workflows/templates` returns a static library of starting
  chains. The dialog shows exactly what a template will create — every step and
  its condition — before confirming.
- Templates are domain knowledge, not user data, so they are a static constant
  rather than a table; the contract shape would allow moving them later.

### 2.6 Multi-scenario simulation

Amounts are saved as chips. Selecting one lights its path on the canvas and
lists which steps run. Evaluation uses the shared contract evaluator, so the
path shown can no longer disagree with what the server will run.

### 2.7 Compound conditions (AND/OR)

A step can now carry a `conditionGroup`: a list of rules with a combinator. This
makes a **range** expressible (`> 5jt AND <= 50jt`), which one rule could not.

- Additive JSONB column; `NULL` keeps the old single-column behaviour, so
  existing rows and their meaning are untouched.
- The group is the source of truth; the first rule is mirrored into the legacy
  columns so old readers and version diffs stay sensible.
- Each rule's field is validated against `CONDITION_FIELDS`.
- The evaluator accepts a per-field resolver, so rules are not silently forced
  to share one field.

**Honest limitation.** Only one field per transaction type is exposed as a
condition field today (`estimatedTotal` for PR, `totalAmount` for PO). So
"AND/OR across different fields" cannot yet be expressed meaningfully; the
feature's real value is multiple rules on the same field. The resolver exists so
a second field can be added without changing the evaluator.

### 2.8 Charts, by data relationship

Charts are chosen from the relationship in the data, not for decoration:

| Question | Relationship | Shape | Note |
|---|---|---|---|
| Where do documents pile up? | Ranking | Horizontal bar | labels read better than vertical |
| What is the outcome per step? | Part of whole | Stacked bar | ≤4 segments |
| Volume over time? | Trend | **Line/area** | was bars — wrong shape for a time series |
| Value distribution + thresholds | Distribution | Histogram + threshold lines | was two separate blocks answering one question |
| Is every step covered? | Single value | **Ring + number** | was a long list — a single value is not a chart |

All colours come from `widgets/dashboard-charts/chart-colors.ts`; no component
introduces a hex. Every chart has a descriptive `aria-label` and a text
equivalent. No chart junk, no truncated or dual axes.

## 3. Testing

The old suite asserted markup (`data-slot="workflow-pipeline"`, `spine-dashed`,
`border-l-2`, `space-y-12`). Those assertions were replaced with behaviour:
DRAFT/ACTIVE rules, mutations, reorder payloads, simulation paths, preflight,
drawer tabs, template creation and duplication. Style assertions that encoded a
real decision were kept in spirit, not in class strings.

New pure logic is unit-tested directly: `preflight`, `evaluateCondition` /
`evaluateConditionGroup`, the insight charts, the template library, and the
service's group handling (mirroring, field validation, JSON round-trip).

## 4. Rollout

Three phases, each committed separately:

1. **Visual workspace** — canvas, IA, lifecycle, inspector, drawer, preflight,
   multi-scenario, charts. Frontend only.
2. **Data capabilities** — duplicate and templates. Backend + contract.
3. **Compound conditions** — migration, evaluator, runtime, UI.

The migration is additive and backwards-compatible; nothing needed to be
backfilled.
