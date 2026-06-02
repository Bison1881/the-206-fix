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
        cream: '#E7E6E7',
        paper: '#DCDADC',
        rust: '#A0522D',
      },
      fontFamily: {
        mast: ['"Press Start 2P"', 'monospace'],
        pixel: ['"Pixelify Sans"', 'sans-serif'],
        display: ['"Jersey 10"', 'sans-serif'],
        body: ['"Jersey 10"', 'sans-serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
        caslon: ['"Jersey 10"', 'sans-serif'],
        ticker: ['"Bitcount Grid Single"', 'monospace'],
      },
    },
  },
  plugins: [],
};
