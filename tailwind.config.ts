import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#E1E7EC",
        gray: colors.slate,
        "soft-gray": "#BABABA",
        "cloud-gray": "#D8D8D8",
        "steel-gray": "#ACACAC",
        "frost-gray": "#ECEEF1",
        "gray-100": "#B8B8B8",
        "primary-blue": "#326DF5",
        "off-white": "#F4F4F5",
        midnight: "#282A36",
        "midnight-100": "#525252",
        "light-frost": "#E5E9EF",
        "light-fog": "#EDF1F5",
        "black-300": "rgba(0, 0, 0, 0.36)",
      },
      borderRadius: {
        "0.5": "2px",
        "1.5": "6px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        input:
          "0px 1px 2px 0px rgba(16, 24, 40, 0.05), 0px 0px 0px 4px #D4DBE5",
        button:
          "0px 1px 2px 0px rgba(16, 24, 40, 0.05), 0px -1.5px 1px 0px rgba(0, 0, 0, 0.43) inset",
        card: "0px 1px 2px 0px rgba(16, 24, 40, 0.05), 0px 0px 0px 4px #E5E9EF",
        btnSM:
          "0px -2px 4px 0px rgba(0, 0, 0, 0.25) inset, 0px 1px 5px 0px rgba(0, 0, 0, 0.25)",
        container: "0px 2px 11px 1px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: ["Aeonik", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
