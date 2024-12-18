export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <body className="flex h-full min-h-full flex-col items-center justify-center">
      {children}
    </body>
  );
}
