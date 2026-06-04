// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{tsx,ts,js,jsx}'],
  theme: {
    extend: {
      colors: {
        "primary": "#172033",
        "secondary": "#0c6780",
        "mint": "#A8F0D4",
        "peach": "#FFD6BA",
        "lavender": "#C7B8FF",
        "sky": "#A7DFFF",
        "rose": "#FFC6DD",
        "soft-yellow": "#FFF1A8",
        pastel: {
          50: 'hsl(210, 30%, 95%)',
          100: 'hsl(210, 30%, 90%)',
          200: 'hsl(210, 30%, 80%)',
          300: 'hsl(210, 30%, 70%)',
          400: 'hsl(210, 30%, 60%)',
          500: 'hsl(210, 30%, 50%)',
        },
      },
      spacing: {
        "container-padding-desktop": "64px",
        "glass-padding": "32px",
        "element-gap": "24px",
        "unit": "8px"
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31,38,135,0.37)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
