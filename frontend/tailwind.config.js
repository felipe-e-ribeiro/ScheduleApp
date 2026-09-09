/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-raised': 'var(--panel-raised)',
        border: 'var(--border)',
        'border-bright': 'var(--border-bright)',
        ink: 'var(--text)',
        'ink-dim': 'var(--text-dim)',
        'ink-faint': 'var(--text-faint)',
        amber: 'var(--amber)',
        'amber-dim': 'var(--amber-dim)',
        green: 'var(--green)',
        'green-dim': 'var(--green-dim)',
        red: 'var(--red)',
        'red-dim': 'var(--red-dim)',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
