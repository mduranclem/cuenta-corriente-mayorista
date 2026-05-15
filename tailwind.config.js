export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#F6F6F6',
        panel: '#FFFFFF',
        border: '#E6E8EC',
        accent: '#4F46E5',
        accentSoft: '#EEF2FF',
        textPrimary: '#111827',
        textSecondary: '#4B5563',
      },
      boxShadow: {
        panel: '0 20px 80px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
