/// <reference types="vite-react-ssg" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // vite-react-ssg reads the routes and prerenders every static path to HTML.
  ssgOptions: {
    script: 'async',
  },
});
