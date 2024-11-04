import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: "#E1E7EC",
        gray: colors.slate,
        dark: {
          background: {
            primary: "#000000",
            secondary: "#111111",
            tertiary: "#222222",
            input: "#1A1A1A",
          },
          primary: "#FFFFFF",
          secondary: "#A1A1AA",
          accent: "#60A5FA",
          border: "#2A2A2A",
          hover: "#2C2C2C"
        },
      },
    },
  },
};

export default config;
