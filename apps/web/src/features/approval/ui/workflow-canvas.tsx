import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@aec/ui';
import type { WorkflowStep } from '@aec/api-contracts';
import {
  WorkflowAnchorNode,
  WorkflowStepNode,
  type WorkflowCanvasNode,
} from './workflow-canvas-node';

const nodeTypes = { step: WorkflowStepNode, anchor: WorkflowAnchorNode };

/** Jarak vertikal antar node (px). Cukup untuk kartu dua baris + konektor. */
const Y_GAP = 104;
/** Y node langkah pertama, memberi ruang untuk anchor pemicu di atasnya. */
const FIRST_STEP_Y = 76;

export interface WorkflowCanvasProps {
  steps: WorkflowStep[];
  selectedStepId?: string;
  onSelectStep: (stepId: string) => void;
  /** Jumlah pemegang role per kode role. 0 berarti rantai macet. */
  holdersByRole: Record<string, number>;
  holderNamesByRole: Record<string, string[]>;
  /** Struktur terkunci (bukan DRAFT): hanya melihat. */
  locked: boolean;
  transactionType: string;
  /** Hasil simulasi: `null` = belum disimulasikan. */
  activeStepOrders?: number[] | null;
  /** Reorder langkah (dipakai drag dan Alt+panah). Urutan id lengkap, terurut. */
  onReorder?: (stepIds: string[]) => void;
}

/** Nama dokumen manusiawi untuk anchor awal dan akhir rantai. */
function subjectOf(transactionType: string): string {
  return transactionType === 'PurchaseOrder' ? 'Purchase order' : 'Purchase requisition';
}

/**
 * Kanvas rantai approval.
 *
 * Tata letak **dipaksakan vertikal** (bukan bebas): rantai approval berurutan,
 * jadi membiarkan node diletakkan di mana saja akan berbohong soal urutan.
 * Karena itu menyeret node berarti **mengubah urutan**, bukan memindahkan posisi
 * — setelah dijatuhkan, node kembali ke grid. Ini juga memberi padanan makna yang
 * sama untuk pengguna keyboard (`Alt` + panah di inspector).
 *
 * Aksesibilitas:
 * - setiap node adalah `<button>` nyata dengan `aria-label` lengkap;
 * - `Tab` masuk ke kanvas, panah atas/bawah memindah fokus antar langkah;
 * - toggle Tabel (di toolbar) menyediakan padanan penuh, konsisten dengan
 *   prinsip dashboard "canvas selalu punya padanan tabel";
 * - `prefers-reduced-motion` mematikan animasi fit/pan.
 */
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function WorkflowCanvasInner({
  steps,
  selectedStepId,
  onSelectStep,
  holdersByRole,
  holderNamesByRole,
  locked,
  transactionType,
  activeStepOrders = null,
  onReorder,
}: WorkflowCanvasProps) {
  const subject = subjectOf(transactionType);
  const simulating = activeStepOrders != null;
  const { fitView, setCenter } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  /** Urutan id saat ini, dipakai untuk menerjemahkan posisi jatuh menjadi urutan baru. */
  const orderSignature = useMemo(() => steps.map((s) => s.id).join('|'), [steps]);

  const buildNodes = useCallback((): WorkflowCanvasNode[] => {
    const anchorStart: WorkflowCanvasNode = {
      id: '__start__',
      type: 'anchor',
      position: { x: 0, y: 0 },
      data: { label: `${subject} submitted` },
      draggable: false,
      selectable: false,
      focusable: false,
    };
    const stepNodes: WorkflowCanvasNode[] = steps.map((step, index) => {
      const skipped = simulating && !activeStepOrders!.includes(step.stepOrder);
      return {
        id: step.id,
        type: 'step',
        position: { x: 0, y: FIRST_STEP_Y + index * Y_GAP },
        selected: step.id === selectedStepId,
        data: {
          step,
          holders: holdersByRole[step.approverRoleCode] ?? 0,
          holderNames: holderNamesByRole[step.approverRoleCode] ?? [],
          locked,
          skipped,
          simulating,
          onSelect: onSelectStep,
          onKeyNav: (stepId, direction) => {
            const i = steps.findIndex((s) => s.id === stepId);
            const target = steps[i + direction];
            if (target) {
              onSelectStep(target.id);
              setCenter(0, FIRST_STEP_Y + (i + direction) * Y_GAP, { zoom: 1, duration: 150 });
            }
          },
        },
        // Hanya bisa diseret bila boleh mengubah struktur.
        draggable: !locked && Boolean(onReorder),
      } satisfies WorkflowCanvasNode;
    });
    const anchorEnd: WorkflowCanvasNode = {
      id: '__end__',
      type: 'anchor',
      position: { x: 0, y: FIRST_STEP_Y + steps.length * Y_GAP },
      data: { label: `${subject} approved` },
      draggable: false,
      selectable: false,
      focusable: false,
    };
    return [anchorStart, ...stepNodes, anchorEnd];
  }, [
    steps, subject, simulating, activeStepOrders, selectedStepId, holdersByRole,
    holderNamesByRole, locked, onSelectStep, onReorder, setCenter,
  ]);

  const buildEdges = useCallback((): Edge[] => {
    const edges: Edge[] = [];
    const ids = ['__start__', ...steps.map((s) => s.id), '__end__'];
    for (let i = 0; i < ids.length - 1; i += 1) {
      const next = steps[i];
      // Garis putus berarti jalur menuju langkah bersyarat (bisa dilewati).
      const gated = Boolean(next?.conditionField);
      edges.push({
        id: `${ids[i]}->${ids[i + 1]}`,
        source: ids[i]!,
        target: ids[i + 1]!,
        type: 'smoothstep',
        style: {
          stroke: '#d4d4d8',
          strokeWidth: 1,
          ...(gated ? { strokeDasharray: '4 4' } : {}),
        },
      });
    }
    return edges;
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowCanvasNode>(buildNodes());
  const [edges, setEdges] = useEdgesState(buildEdges());

  // Susun ulang graf saat langkah/selection/simulasi berubah.
  useEffect(() => {
    setNodes(buildNodes());
    setEdges(buildEdges());
  }, [orderSignature, selectedStepId, simulating, activeStepOrders, buildNodes, buildEdges, setNodes, setEdges]);

  // Fit view sekali setelah mount agar rantai langsung terlihat penuh.
  useEffect(() => {
    const id = window.setTimeout(() => fitView({ padding: 0.2, duration: 0 }), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Terjemahkan posisi jatuh menjadi urutan baru. Node yang jatuh di antara dua
   * langkah lain dianggap pindah ke sana; lalu grid dipulihkan oleh re-render.
   */
  const handleDragStop = useCallback(
    (_event: unknown, node: WorkflowCanvasNode) => {
      if (node.type !== 'step' || !onReorder) return;
      const fromIndex = steps.findIndex((s) => s.id === node.id);
      if (fromIndex < 0) return;
      const raw = Math.round((node.position.y - FIRST_STEP_Y) / Y_GAP);
      const toIndex = Math.max(0, Math.min(steps.length - 1, raw));
      if (toIndex === fromIndex) {
        // Tidak berpindah: cukup kembalikan ke grid.
        setNodes(buildNodes());
        return;
      }
      const next = [...steps];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved!);
      onReorder(next.map((s) => s.id));
    },
    [steps, onReorder, setNodes, buildNodes],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<WorkflowCanvasNode>[]) => {
      // Node anchor tidak boleh bergerak; buang perubahan posisinya.
      const filtered = changes.filter((c) => !(c.type === 'position' && (c.id === '__start__' || c.id === '__end__')));
      onNodesChange(filtered);
    },
    [onNodesChange],
  );

  if (steps.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
        <div>
          <p className="text-body font-medium text-neutral-700">No steps yet</p>
          <p className="mt-0.5 text-body-sm text-neutral-500">
            {locked ? 'Create a new version to add steps.' : 'Add the first step to define who approves.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      data-slot="workflow-canvas"
      className={cn(
        'h-[560px] w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-50',
        'motion-reduce:[&_.react-flow__node]:!transition-none',
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleDragStop}
        nodesDraggable={!locked && Boolean(onReorder)}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.6}
        proOptions={{ hideAttribution: false }}
        aria-label={`Approval chain for ${subject.toLowerCase()}`}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e4e4e7" />
        <Controls showInteractive={false} className="!rounded-md !border !border-neutral-200 !bg-white !shadow-xs" />
        <MiniMap
          pannable
          zoomable
          className="!rounded-md !border !border-neutral-200 !bg-white"
          nodeColor={(n) => (n.type === 'anchor' ? '#e4e4e7' : '#a1a1aa')}
          maskColor="rgba(244,244,245,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
