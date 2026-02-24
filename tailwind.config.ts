import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'cinematic-bg': '#0B0B12',
        'plasma-blue': '#06B6D4',
        'electric-purple': '#A855F7',
        'lava-orange': '#F97316',
        'neon-magenta': '#EC4899',
      },
      backdropBlur: {
        'cinematic': '16px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(6, 182, 212, 0.3)',
        'glow-md': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-lg': '0 0 30px rgba(168, 85, 247, 0.6)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-purple': '0 0 30px rgba(168, 85, 247, 0.6)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.4)',
        'glow-magenta': '0 0 20px rgba(236, 72, 153, 0.4)',
      },
      spacing: {
        'cinematic': '2rem',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
