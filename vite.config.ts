import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repo at /mash-adventure-web/. The itch build overrides base to ./
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/mash-adventure-web/',
});
