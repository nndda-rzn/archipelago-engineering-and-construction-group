import type { Config } from 'tailwindcss';
import aecPreset from '@aec/config/tailwind.preset';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  presets: [aecPreset],
  plugins: [tailwindcssAnimate],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral workspace — PRD §20.4, Design-Tokens §2
        neutral: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Semantic — PRD §20.5, Design-Tokens §3
        success: { 50: '#f0fdf4', 100: '#dcfce7', 300: '#86efac', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
        warning: { 50: '#fffbeb', 100: '#fef3c7', 300: '#fcd34d', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        destructive: { 50: '#fef2f2', 100: '#fee2e2', 300: '#fca5a5', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
        info: { 50: '#eff6ff', 100: '#dbeafe', 300: '#93c5fd', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        // Project health
        'project-on-track': { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
        'project-at-risk': { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        'project-critical': { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
        // Financial
        'financial-positive': { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        'financial-negative': { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        h1: ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        h2: ['1rem', { lineHeight: '1.4', fontWeight: '600' }],
        h3: ['0.875rem', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.5' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.5' }],
        overline: ['0.6875rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.07)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
      },
      spacing: {
        0: '0px',
        px: '1px',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      zIndex: {
        sticky: '10',
        dropdown: '20',
        drawer: '40',
        'modal-backdrop': '50',
        modal: '60',
        toast: '70',
        tooltip: '80',
        command: '90',
      },
      keyframes: {
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-down': 'slide-down 200ms ease',
        'slide-up': 'slide-up 200ms ease',
      },
    },
  },
} satisfies Config;