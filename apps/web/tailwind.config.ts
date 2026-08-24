import type { Config } from 'tailwindcss';
import aecPreset from '@aec/config/tailwind.preset';

export default {
  presets: [aecPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral workspace — PRD §20.4
        workspace: {
          background: '#FAFAFA',
          card: '#FFFFFF',
          border: '#E5E5E5',
        },
        // Semantic — PRD §20.5 (terpisah dari brand)
        semantic: {
          success: '#16a34a',
          warning: '#d97706',
          destructive: '#dc2626',
          info: '#2563eb',
        },
      },
    },
  },
} satisfies Config;
