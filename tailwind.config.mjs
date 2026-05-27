/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a1a',
        forest: '#2D4A3E',
        slate: '#4A5560',
        fog: '#8FA9B8',
        cream: '#E8E4D9',
        paper: '#DDD8CB',
        rust: '#A0522D',
      },
      fontFamily: {
        mast: ['"Press Start 2P"', 'monospace'],
        display: ['"Playfair Display"', 'serif'],
        pixel: ['"Pixelify Sans"', 'sans-serif'],
        body: ['"Source Serif 4"', 'Georgia', 'serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
        caslon: ['"Libre Caslon Text"', 'serif'],
      },
    },
  },
  plugins: [],
};
