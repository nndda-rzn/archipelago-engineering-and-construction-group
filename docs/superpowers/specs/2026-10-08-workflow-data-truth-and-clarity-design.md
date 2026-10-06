# Workflow Page — Data Truth then Visual Clarity

> Spec for the two-phase redesign of `/workflows`. Supersedes the canvas-era
> assumptions in `2026-10-07-workflow-workspace-redesign-design.md`.
> Branch phase 1: `feature/workflow-data-truth` · phase 2: `feature/workflow-visual-clarity`.

## Why two phases, in this order

The page mixed two data scopes and reported a wrong number. Fixing typography on
top of a wrong number produces a well-set lie, so correctness lands first:

| Phase | Request | Scope |
|---|---|---|
| 1 — Correct | Separate the data contexts · Evaluate the data visualisation | contract + DB + insights |
| 2 — Clear | Visual hierarchy · Colouring · Workflow builder | presentation only |

## Phase 1 — Correct

### The mixed-context problem

`GET /workflows/:id/insights` returned numbers computed at two different scopes
without saying so:

- `coverage` is per **definition** (does every step have an approver?)
- `byStep`, `amounts`, `monthly` are per **transactionType** (all versions mixed)

Root cause was in the data: `ApprovalTask` stored no definition, so per-version
insight was impossible to compute. `ApprovalTask.definitionId` (nullable,
`ON DELETE SET NULL`, indexed) fixes it. Both task-creating paths already held the
active definition, so recording it was free.

Backfill is **evidence-based**: a task is attributed only when its
`(stepOrder, stepName, approverRoleCode)` matches exactly one step of the ACTIVE
definition for its transaction type. On the seeded data this fills 0 of 20 tasks,
because the seed's task step names differ from the definition's. That is the
correct outcome — attributing them would attach documents to versions that may not
have existed yet. The UI calls those tasks "no recorded version".

### The wrong number

Approval rate was `lastStep.approved / firstStep.total`. Two faults:

1. It discards documents that legitimately finish at an early step.
2. Summing `approved` across steps double-counts a document that appears in
   several steps.

It now counts **per document**, in a pure function
(`shared/document-outcomes.ts`) with tests. Real data: 36% → **45%** (5 of 11).

### Scope is now stated, not implied

`scope { requested, applied, taskCount, versionBreakdown }`. The version mixture
is shown in the panel, not hidden behind one number.
`GET /workflows/:id/insights?scope=version|type`, default `type`, so behaviour is
unchanged unless the caller opts in.

### The funnel was the wrong shape

The funnel read "11 documents at step 1, 6 at step 2" as five documents lost. Those
five finished at step 1 because the later rule did not match — routing, not loss.
A funnel is valid only when values decrease monotonically *and* the decrease means
loss. Neither holds here.

Replaced by **one stacked bar per step** (`workflow-step-outcomes.tsx`), which also
absorbs the separate "Outcome by step" block that duplicated the same data — so the
panel has fewer blocks, not more. A sentence states plainly that a step is skipped
when its rule does not match.

Bucket labels no longer mix units: `100jt–1M` next to `1M–10M` made `M` ambiguous;
all bounds below a billion now read in `jt`.

## Phase 2 — Clear

### Selection is a background, everywhere

`border-l-2` marked selection in Z1 and Z3 — the only two places in the app that
did. Sidebar nav, SegmentedControl, DataGrid and financial band all use a
background. The rule is `consistency` (Style Selection, HIGH): *use the same style
across all pages*. Both zones now use `bg-neutral-100`, matching sidebar nav.

Nothing was lost. Each meaning keeps its own carrier:

| Meaning | Carrier after the border is gone |
|---|---|
| Selected (Z1) | background + filled dot for the ACTIVE version |
| Selected (Z3) | background + `bg-neutral-800` order badge |
| No approver (Z3) | `bg-destructive-100` badge + warning icon + text |

The transparent 2px border on every row was also pure visual noise — it occupied
space without carrying meaning.

A note on what was **not** changed: `xl:border-l` in the inspector is a column
separator, not a selection accent, and `approval-queue.tsx` uses the same pattern
but lives in `/approvals`. Neither is touched.

### Heading hierarchy

The right pane had four sibling `h2`s (definition name, "Approval chain",
"Step details", "Simulate"), making everything look equally important, and Insights
used `h4` with no `h3` parent — an `h1 → h4` skip. Now: one `h1`, one `h2` (the
definition), and `h3` for each section. A test walks the heading list and fails if
any level is skipped.

### Definition band

Identity (name, status, code, version, lifecycle) and actions are now separate:
the identity sits in its own bordered band labelled `Definition summary`, and the
actions sit in a named `Workflow actions` group. "What am I looking at" no longer
competes with "what can I do".

### Chain reads as a sequence

The order was a 20px badge. It is now a numbered rail marker with a connecting line
between consecutive steps (stopping at the last), and the collection header facts
became a `dl` with separators instead of three equally-weighted text runs.

## Verification

| Check | Result |
|---|---|
| API tests | 264 (was 248) |
| Web tests | 508 (was 463) |
| Typecheck / lint | 10/10 · 6/6 (1 pre-existing warning in `packages/ui`) |
| Builds | web + api succeed |
| Migration | applied, rolled back, and replayed from an empty database |
| Write path | proven end to end: a new task stored `definitionId` = PR_APPROVAL v2 |
| Scope | `scope=version` went 0 → 1 task once a versioned task existed |

## Limits, stated plainly

- The seeded tasks carry step names that do not match their definitions, so they
  remain unattributed. Only tasks created after this change are attributed.
- `scope=version` therefore shows little on existing data. The `versionBreakdown`
  line exists to say so rather than to hide it.
- Drag-and-drop is still not exercised in jsdom; the mandatory button path is
  tested instead.
