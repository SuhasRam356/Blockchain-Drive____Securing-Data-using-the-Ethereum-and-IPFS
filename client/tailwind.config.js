/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        web3: {
          dark: '#0a0b10',
          card: '#13151f',
          neon: '#00f3ff',
          purple: '#b026ff',
          green: '#00ff88',
        }
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite alternate',
      },
      keyframes: {
        'glow-pulse': {
          '0%': { boxShadow: '0 0 10px rgba(0, 243, 255, 0.1)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 243, 255, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
