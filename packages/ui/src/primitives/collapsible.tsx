import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

/**
 * Collapsible (Radix) untuk grup navigasi. Diteruskan apa adanya agar konsumen
 * mendapat ARIA (`aria-expanded`/`aria-controls`) dan `data-state` otomatis,
 * tanpa menambah dependensi Radix langsung di `apps/web`.
 */
const Root = CollapsiblePrimitive.Root;
const Trigger = CollapsiblePrimitive.Trigger;
const Content = CollapsiblePrimitive.Content;

export { Root, Trigger, Content };
export type CollapsibleRootProps = React.ComponentProps<typeof Root>;
