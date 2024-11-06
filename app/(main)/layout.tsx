import Image from "next/image";
import bgImg from "@/public/halo.png";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <body className="bg-brand antialiased">
      <div className="absolute inset-x-0 flex justify-center">
        <Image
          src={bgImg}
          alt=""
          className="w-full max-w-[1200px] mix-blend-screen"
          priority
        />
      </div>

      <div className="isolate">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center py-2">
          <Header />
          {children}
          <Footer />
        </div>
      </div>
    </body>
  );
}
