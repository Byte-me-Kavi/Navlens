/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "navlens-primary": "#FFFFFF", // Clean White - main color
        "navlens-accent": "#00C8C8", // Bright Teal
        "navlens-electric-blue": "#007FFF", // Electric Blue
        "navlens-purple": "#8A2BE2", // Subtle Purple from logo
        "navlens-magenta": "#FF00FF", // Hotspot/AI glow
        "navlens-dark": "#1A1A1A", // Dark background
        "navlens-gray": "#2D2D2D", // Card background
        "navlens-text-light": "#F0F4F8",
        "navlens-text-dark": "#333333",
      },
      fontFamily: {
        sans: ["Inter", "Poppins", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 200, 200, 0.6)",
        "glow-blue": "0 0 20px rgba(0, 127, 255, 0.5)",
        "glow-magenta": "0 0 20px rgba(255, 0, 255, 0.5)",
        depth:
          "5px 5px 15px rgba(0, 0, 0, 0.3), -5px -5px 15px rgba(255, 255, 255, 0.05)",
      },
      animation: {
        spotlight: "spotlight 2s ease .75s 1 forwards",
      },
      keyframes: {
        spotlight: {
          "0%": {
            opacity: 0,
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: 1,
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
      },
    },
  },
  plugins: [],
};
