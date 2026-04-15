import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',  // primary
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        sidebar: {
          bg:     '#0F172A',
          hover:  '#1E293B',
          active: '#2563EB',
          text:   '#94A3B8',
          'text-active': '#F8FAFC',
        },
        status: {
          'success-bg':   '#F0FDF4',
          'success-text': '#16A34A',
          'success-border':'#BBF7D0',
          'warning-bg':   '#FFFBEB',
          'warning-text': '#D97706',
          'warning-border':'#FDE68A',
          'danger-bg':    '#FEF2F2',
          'danger-text':  '#DC2626',
          'danger-border':'#FECACA',
          'info-bg':      '#EFF6FF',
          'info-text':    '#2563EB',
          'info-border':  '#BFDBFE',
          'pending-bg':   '#F8FAFC',
          'pending-text': '#64748B',
          'pending-border':'#E2E8F0',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.02), 0 1px 2px -1px rgb(0 0 0 / 0.02)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.04), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        sidebar: '240px',
      },
    },
  },
  plugins: [],
} satisfies Config;
