import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2563eb', fg: '#ffffff' },
        surface: { DEFAULT: '#ffffff', muted: '#f4f4f5' },
        ink: { DEFAULT: '#18181b', muted: '#52525b' },
      },
      borderRadius: {
        card: '0.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
} satisfies Partial<Config>;
