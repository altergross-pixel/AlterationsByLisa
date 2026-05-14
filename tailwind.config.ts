import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAFAF7',
          100: '#F5F0E8',
          200: '#EDE4D4',
        },
        gold: {
          DEFAULT: '#C4963A',
          light: '#E8D5A3',
          dark: '#9A7228',
        },
        charcoal: {
          DEFAULT: '#1C1C1E',
          light: '#3A3A3C',
          muted: '#6C6C70',
        },
        border: '#E8DFD0',
        status: {
          new: '#3B82F6',
          progress: '#F59E0B',
          ready: '#10B981',
          paid: '#6B7280',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        gold: '0 0 0 3px rgba(196,150,58,0.20)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}

export default config
