/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: { md: '768px', lg: '1024px' },
      // Role-based wellness tokens. Legacy names preserve feature code while
      // the visual system moves to semantic background, text, and tint roles.
      colors: {
        bg: 'rgb(var(--ios-background) / <alpha-value>)',
        surface: 'rgb(var(--ios-secondary-background) / <alpha-value>)',
        surface2: 'rgb(var(--ios-tertiary-background) / <alpha-value>)',
        section: 'rgb(var(--ios-label) / <alpha-value>)',
        'line-card': '#E0D8CC',
        'line-sidebar': 'rgb(var(--ios-separator) / <alpha-value>)',
        'line-track': 'rgb(var(--ios-fill) / <alpha-value>)',
        'line-streak': 'rgb(var(--ios-separator) / <alpha-value>)',
        ink: {
          50: 'rgb(var(--ios-tertiary-background) / <alpha-value>)', 100: 'rgb(var(--ios-quaternary-fill) / <alpha-value>)',
          200: 'rgb(var(--ios-separator) / <alpha-value>)', 300: 'rgb(var(--ios-opaque-separator) / <alpha-value>)',
          400: 'rgb(var(--ios-tertiary-label) / <alpha-value>)', 500: 'rgb(var(--ios-secondary-label) / <alpha-value>)',
          600: 'rgb(var(--ios-secondary-label) / <alpha-value>)', 700: 'rgb(var(--ios-label) / <alpha-value>)',
          800: 'rgb(var(--ios-label) / <alpha-value>)', 900: 'rgb(var(--ios-label) / <alpha-value>)',
        },
        accent: {
          50: '#F0FBF4', 100: '#D4F0E0', 200: '#B8EDD0',
          300: '#1A6B38', 400: '#1A6B38', 500: '#1A6B38', 600: '#155830', 700: '#155830',
        },
        amber: { 50: '#fff8e1', 100: '#ffecb3', 200: '#ffe082', 300: '#ffca28', 400: '#ffb300', 500: '#ff9500', 600: '#c77700', 700: '#9a5c00', 900: '#633b00' },
        coral: { 100: '#ffebe8', 300: '#ff6b5e', 400: '#ff453a', 500: '#d70015' }, fat: { 400: '#ff453a' },
        clay: { 100: 'rgb(var(--clay-wash) / <alpha-value>)', 400: 'rgb(var(--clay) / <alpha-value>)', 500: 'rgb(var(--clay-strong) / <alpha-value>)' },
        brand: { 200: 'rgb(var(--sage-soft) / <alpha-value>)', 500: 'rgb(var(--sage-ink) / <alpha-value>)', 600: 'rgb(var(--sage-strong) / <alpha-value>)' },
        sky: { 50: '#e8f5ff', 100: '#d9f0ff', 300: '#64d2ff', 400: '#0a84ff', 500: '#007aff', 600: '#0066d6' },
      },
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'system-ui', 'sans-serif'], display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'system-ui', 'sans-serif'], heading: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '1rem' }, transitionDuration: { DEFAULT: '180ms' },
      boxShadow: { card: '0 2px 8px rgba(0, 0, 0, 0.08)', glow: '0 0 0 3px rgb(26 107 56 / 0.24)' },
      keyframes: { 'fade-slide-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }, wave: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } }, pop: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)' } } },
      animation: { 'page-in': 'fade-slide-up 0.2s ease-out', wave: 'wave 2.2s linear infinite', pop: 'pop 0.3s ease-out' },
    },
  }, plugins: [],
};
