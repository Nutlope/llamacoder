import Providers from "@/app/(main)/providers";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <body className="flex h-full flex-col bg-gray-100 text-gray-900 antialiased">
        {children}
      </body>
    </Providers>
  );
}
