import * as React from 'react';
import { Button, type ButtonProps } from '../primitives/button';
import { ConfirmDialog } from '../primitives/dialog';

export interface ConfirmActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  confirmTitle: string;
  confirmDescription?: string;
  confirmLabel?: string;

  onConfirm: () => void;
}

export function ConfirmActionButton({
  confirmTitle,
  confirmDescription,
  confirmLabel = 'Konfirmasi',
  onConfirm,
  variant = 'secondary',
  size = 'sm',
  children,
  ...props
}: ConfirmActionButtonProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} {...props}>
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        onConfirm={onConfirm}
      />
    </>
  );
}
