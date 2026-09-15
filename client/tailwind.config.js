/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: { md: '768px', lg: '1024px' },
      colors: {
        // Backgrounds — mostly neutral
        bg: '#F2F2F7',
        surface: '#FFFFFF',
        surface2: '#F2F2F7',

        // Section labels
        section: '#8E8E93',

        // Card borders & tracks
        'line-card': '#E5E5EA',
        'line-sidebar': '#E5E5EA',
        'line-track': '#E5E5EA',
        'line-streak': '#E5E5EA',

        // Text — Apple standard
        ink: {
          50: '#FFFFFF',
          100: '#F2F2F7',
          200: '#E5E5EA',
          300: '#C7C7CC',
          400: '#8E8E93',
          500: '#636366',
          600: '#636366',
          700: '#3A3A3C',
          800: '#1C1C1E',
          900: '#1C1C1E',
        },

        // Primary brand green — vivid
        accent: {
          50: '#E8FFF0',
          100: '#D1FFE1',
          200: '#B8F5C8',
          300: '#30D158',
          400: '#30D158',
          500: '#28B14A',
          600: '#1E8A3A',
        },

        // Macro ring colors — Apple Health Activity ring colors
        protein: {
          400: '#30D158',
          500: '#28B14A',
        },
        carbs: {
          400: '#FF9F0A',
          500: '#E8900A',
        },
        fat: {
          400: '#FF453A',
          500: '#E03530',
        },

        // Water
        sky: {
          400: '#0A84FF',
          500: '#0070E0',
        },

        // Semantic
        success: '#30D158',
        warning: '#FF9F0A',
        error: '#FF453A',

        // Legacy aliases
        brand: {
          400: '#30D158',
          500: '#28B14A',
          600: '#1E8A3A',
        },
        coral: {
          100: '#FFE8E6',
          300: '#FF453A',
          400: '#FF453A',
          500: '#E03530',
        },
        amber: {
          100: '#FFF4E0',
          300: '#FF9F0A',
          400: '#FF9F0A',
          500: '#E8900A',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'ui-serif', 'Georgia', 'serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"DM Sans"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        heading: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"DM Sans"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        none: '0',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        full: '9999px',
        card: '16px',
      },
      transitionDuration: { DEFAULT: '180ms' },
      boxShadow: {
        none: 'none',
        low: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        mid: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        high: '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        glow: '0 0 0 3px rgba(40,177,74,0.15)',
        card: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      },
      keyframes: {
        'fade-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        wave: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'page-in': 'fade-slide-up 0.2s ease-out',
        wave: 'wave 2.2s linear infinite',
        pop: 'pop 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
