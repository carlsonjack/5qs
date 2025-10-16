import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#76B900",
          50: "#F0F9E6",
          100: "#E1F3CC",
          200: "#C3E799",
          300: "#A5DB66",
          400: "#87CF33",
          500: "#76B900",
          600: "#5E9400",
          700: "#476F00",
          800: "#2F4A00",
          900: "#172500",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
        "glass-elevated": "var(--glass-elevated-blur)",
      },
      backgroundImage: {
        "glass-surface":
          "color-mix(in oklab, var(--glass-tint) calc(var(--glass-opacity) * 100%), transparent)",
        "glass-elevated":
          "color-mix(in oklab, var(--glass-tint) calc(var(--glass-elevated-opacity) * 100%), transparent)",
      },
      boxShadow: {
        glass: "var(--glass-shadow)",
        "glass-elevated": "var(--glass-elevated-shadow)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities, addComponents }) {
      addUtilities({
        ".glass-surface": {
          "backdrop-filter": "blur(var(--glass-blur))",
          background:
            "color-mix(in oklab, var(--glass-tint) calc(var(--glass-opacity) * 100%), transparent)",
          border: "1px solid var(--glass-border)",
          "box-shadow": "var(--glass-shadow)",
        },
        ".glass-elevated": {
          "backdrop-filter": "blur(var(--glass-elevated-blur))",
          background:
            "color-mix(in oklab, var(--glass-tint) calc(var(--glass-elevated-opacity) * 100%), transparent)",
          border: "1px solid var(--glass-border)",
          "box-shadow": "var(--glass-elevated-shadow)",
        },
        ".glass-divider": {
          "border-top": "1px solid var(--glass-border)",
        },
        ".chrome-hover": {
          transition: "filter 0.2s ease",
        },
        ".chrome-hover:hover": {
          filter: "brightness(1.05)",
        },
        ".edge-fade": {
          "mask-image":
            "linear-gradient(to bottom, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
        },
        ".glass-outline": {
          border: "1px solid var(--glass-border)",
          transition: "border-color 0.2s ease",
        },
        ".glass-outline:focus": {
          "border-color": "hsl(var(--ring))",
          outline: "none",
        },
      });
    },
  ],
};
export default config;
