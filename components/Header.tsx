import Image from "next/image";
import Link from "next/link";
import logo from "../public/logo.svg";
// import GithubIcon from "./github-icon";
import together from "../public/together.svg";
import together_logo from "../public/together-logo.svg";
import { cn } from "@/lib/utils";


export default function Header({className}: Readonly<{className?: string}>) {
  return (
    <header className={cn(
      "mt-5 flex w-full items-center justify-center gap-2.5 px-2 pb-7 sm:px-4",
      className
    )}>
      <Link href="/" className="flex items-center gap-1">
        <Image alt="header text" src={logo} className="h-5 w-5" />
        <h1 className="text-xl tracking-tight font-normal text-midnight">
          <span className="text-primary-blue">Llama</span>Coder
        </h1>
      </Link>
      <div className="h-5 w-0.5 inline-block bg-[#C2C2C2]"></div>
      
       <Link href="/" className="flex items-center gap-1 h-5">
        <Image alt="header text" src={together_logo} className="h-5 w-5" />
        <div className="flex flex-col gap-[1px]">
          <span className="text-[8px] tracking-tight italic font-thin ml-0.5 text-midnight text-start">Made by:</span>
          <Image alt="" src={together} className="h-2.5 w-14" />
        </div>
      </Link>
    </header>
  );
}
