/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        caption: ["0.8125rem", { lineHeight: "1.25" }],   // 13px
        label: ["0.9375rem", { lineHeight: "1.35" }],      // 15px
        body: ["1rem", { lineHeight: "1.6" }],             // 16px
        "title-sm": ["1.125rem", { lineHeight: "1.35" }],  // 18px
        title: ["1.25rem", { lineHeight: "1.35" }],        // 20px
      },
    },
  },
  plugins: [],
};
