export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#0F1419',
        panel: '#1C2128',
        border: '#30363D',
        accent: '#6366F1',
        accentSoft: '#2D1B69',
        textPrimary: '#E6EDF3',
        textSecondary: '#9CA3AF',
      },
      boxShadow: {
        panel: '0 20px 80px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};
