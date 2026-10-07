/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          foreground: 'var(--danger-foreground)',
        },
        navy: {
          50: 'var(--navy-50)',
          100: 'var(--navy-100)',
          200: 'var(--navy-200)',
          900: 'var(--navy-900)',
        },
        gold: {
          50: 'var(--gold-50)',
          100: 'var(--gold-100)',
          400: 'var(--gold-400)',
          600: 'var(--gold-600)',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 4px)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 8px)',
        '2xl': 'calc(var(--radius) + 12px)',
        '3xl': '24px',
        '4xl': '32px',
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(39, 59, 140, 0.08)',
        'card-hover': '0 12px 32px rgba(39, 59, 140, 0.15)',
        'nav': '0 2px 16px rgba(0, 0, 0, 0.08)',
        'modal': '0 24px 64px rgba(0, 0, 0, 0.2)',
        'btn-primary': '0 4px 16px rgba(39, 59, 140, 0.3)',
        'btn-secondary': '0 4px 16px rgba(251, 192, 45, 0.4)',
        'inner-sm': 'inset 0 1px 3px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease forwards',
        'scale-in': 'scaleIn 200ms ease forwards',
        'slide-up': 'slideUp 300ms ease forwards',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};