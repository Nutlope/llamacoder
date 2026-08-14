import localFont from "next/font/local";

export const aeonik = localFont({
  src: [
    {
      path: "../public/Aeonik/Aeonik-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/Aeonik/Aeonik-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/Aeonik/Aeonik-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-aeonik",
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const aeonikMono = localFont({
  src: "../public/Aeonik/AeonikMono-Regular.otf",
  display: "swap",
  variable: "--font-aeonik-mono",
  fallback: ["monospace"],
  preload: false,
});
