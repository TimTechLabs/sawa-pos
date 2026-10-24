/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sawaDark: "#172B3A",
        sawaBlue: "#2563EB",
        sawaBg: "#F5F7FA",
        sawaBorder: "#DCE3EA",
        sawaText: "#17212B",
        sawaMuted: "#64748B",
        sawaSuccess: "#15803D",
        sawaWarning: "#B45309",
        sawaError: "#B91C1C",
      },
    },
  },
  plugins: [],
}