import Image from "next/image";
import Link from "next/link";



export default function Header() {
  return (
    <header className="mt-5 flex w-full items-center justify-center gap-2.5 px-2 pb-7 sm:px-4 divide-x">
       <Link href="/" className="flex items-center gap-1 h-5">
        <Image alt="header text" src={'/together-logo.svg'} width={20} height={20} className="h-5 w-5" />
        <div className="flex flex-col gap-[1px]">
          <span className="text-[8px] tracking-tight italic font-thin ml-0.5 text-midnight">Made by:</span>
          <Image alt="" src={'/together.svg'} width={56} height={10} className="h-2.5 w-14" />
        </div>
      </Link>
    </header>
  );
}
