import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crema: "#f8f3e8",
        ink: "#1e1c18",
        roast: "#6c4630",
        sage: "#6f7f5f",
        berry: "#9f3f55",
        brass: "#c08a3d"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
