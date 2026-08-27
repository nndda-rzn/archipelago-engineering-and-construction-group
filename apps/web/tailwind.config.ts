import type { Config } from 'tailwindcss';
import aecPreset from '@aec/config/tailwind.preset';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Design token AEC ERP didefinisikan SATU kali di `@aec/config/tailwind.preset`
 * (PR #95 — token structure). Config ini hanya memakai preset, tanpa duplikasi nilai.
 */
export default {
  presets: [aecPreset],
  plugins: [tailwindcssAnimate],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
} satisfies Config;
