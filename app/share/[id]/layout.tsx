export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <body className="flex min-h-full flex-col">{children}</body>;
}
