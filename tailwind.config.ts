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
      },
      keyframes: {
        "chat-panel": {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "chat-bubble": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "chat-dot": {
          "0%, 60%, 100%": { opacity: "0.35", transform: "translateY(0)" },
          "30%": { opacity: "1", transform: "translateY(-4px)" }
        }
      },
      animation: {
        "chat-panel": "chat-panel 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        "chat-bubble": "chat-bubble 200ms ease-out",
        "chat-dot": "chat-dot 1.2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
