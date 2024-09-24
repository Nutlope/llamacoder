import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
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
        'soft-gray': "#BABABA",
        'cloud-gray': "#D8D8D8",
        'primary-blue': "#326DF5",
        'skyline-blue': "#326DF5",
        'off-white': "#F4F4F5",
        midnight: '#282A36',
        
      },
      borderRadius: {
        '1.5': '6px',
      },
      boxShadow: {
        'input': '0px 1px 2px 0px rgba(16, 24, 40, 0.05), 0px 0px 0px 4px #D4DBE5',
      },
      fontFamily: {
        sans: ['"Aeonik"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
};

export default config;
