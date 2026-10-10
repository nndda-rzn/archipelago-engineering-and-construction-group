import { Button, ConfirmActionButton } from '@aec/ui';
import type { LegalEntity } from '@aec/api-contracts';
import { useBlockLegalEntity, useUnblockLegalEntity } from '@/entities/legal-entity';

/**
 * Aksi siklus hidup: Edit + Blokir/Aktifkan. Blokir memakai dialog konfirmasi
 * yang menyebut dampaknya (entity ini dipakai di mana) — aksi destruktif tidak
 * disamarkan, dan `Activate` sama menonjol untuk membaliknya.
 */
export function LegalEntityLifecycle({ entity, onEdit }: { entity: LegalEntity; onEdit: () => void }) {
  const block = useBlockLegalEntity(entity.id);
  const unblock = useUnblockLegalEntity(entity.id);

  if (entity.status === 'BLOCKED') {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
        <Button size="sm" onClick={() => unblock.mutate()} loading={unblock.isPending}>Activate</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
      <ConfirmActionButton
        variant="destructive"
        confirmTitle={`Block ${entity.code}?`}
        confirmDescription="Blocking stops this entity from being used for new transactions. Existing records are not deleted. Review where it is used before blocking."
        confirmLabel="Block entity"
        onConfirm={() => block.mutate()}
      >
        Block
      </ConfirmActionButton>
    </div>
  );
}
