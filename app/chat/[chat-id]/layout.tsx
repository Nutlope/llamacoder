export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-off-white antialiased">
      <div className="isolate">{children}</div>
    </div>
  );
}
