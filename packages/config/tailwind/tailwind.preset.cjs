/** @type {import('tailwindcss').Config} */
/**
 * Satu-sumber design token AEC ERP (PR #95 — token structure).
 * Semua warna/typography/radius/shadow/spacing/motion/z-index didefinisikan di sini.
 * apps/web/tailwind.config.ts hanya memakai preset ini (tanpa duplikasi nilai).
 * Nilai visual TIDAK berubah pada PR ini — hanya restrukturisasi lokasi definisi.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand — Racing Red (PRD §20.2). Shade diturunkan dari #ff0000 murni ke ramp
        // yang lebih dalam agar mata-friendly di workspace terang (UI/UX-05).
        'racing-red': {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Neutral workspace — zinc (UI/UX-05). Lebih hangat/halus dari gray murni.
        neutral: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        // Semantic (PRD §20.5) — scale penuh 50-900 agar bg/border/teks konsisten
        success: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
        },
        destructive: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
        },
        info: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
        // Project health
        'project-on-track': { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
        'project-at-risk': { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        'project-critical': { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
        // Financial
        'financial-positive': { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        'financial-negative': { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontWeight: {
        // Dipakai Button (font-button). Sebelumnya class ini dirujuk tetapi tokennya
        // tidak ada, sehingga label button tidak punya weight eksplisit (PR-2).
        button: '500',
      },
      fontSize: {
        // h1 adalah judul halaman. Dinaikkan 20px -> 24px (PR-2) agar judul jelas
        // mendominasi; tetap lebih kecil dari 28px agar hierarchy dengan h2 (16px) terjaga.
        display: ['2.5rem', { lineHeight: '1.1', fontWeight: '600' }],
        h1: ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],
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
};
