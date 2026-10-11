export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        display: ['Schibsted Grotesk', 'IBM Plex Sans', 'sans-serif'],
      },
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        mute: 'var(--mute)',
        line: 'var(--line)',
        human: 'var(--human)',
        animal: 'var(--animal)',
        env: 'var(--env)',
        alert: 'var(--alert)',
      },
      borderRadius: {
        tool: '8px',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(5, 12, 20, 0.08)',
      },
    },
  },
  plugins: [],
};
