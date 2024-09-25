import Image from "next/image";
import bgImg from "@/public/halo.png";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <body className="bg-off-white antialiased">
      <div className="absolute inset-x-0 flex justify-center">
        <Image
          src={bgImg}
          alt=""
          className="w-full max-w-[1200px] mix-blend-screen hidden sm:block"
          priority
        />
      </div>

      <div className="isolate">{children}</div>
    </body>
  );
}
 