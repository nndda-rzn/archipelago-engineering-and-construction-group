import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // `host: true` membuat Vite listen di 0.0.0.0, bukan hanya 127.0.0.1.
    // Tanpa ini dev server tidak bisa diakses dari luar mesin (mis. VPS via IP publik).
    // Penting saat dijalankan lewat systemd: environment minimal membuat Vite
    // kembali ke default `localhost`, sementara tmux mewarisi shell yang men-set-nya.
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
