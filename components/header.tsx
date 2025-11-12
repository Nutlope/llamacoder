import Image from "next/image";
import { memo } from "react";

import GithubIcon from "@/components/icons/github-icon";
import logo from "@/public/logo.png";
import Link from "next/link";

function Header() {
  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/">
        <Image
          src={logo}
          alt=""
          quality={100}
          className="mx-auto h-9 object-contain"
          priority
        />
      </Link>

      <div className="absolute right-3">
        <a
          href="https://github.com/nutlope/llamacoder"
          target="_blank"
          className="ml-auto hidden items-center gap-3 rounded-xl border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 sm:flex"
        >
          <GithubIcon className="h-[18px] w-[18px]" />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900">6k+</span>
          </div>
        </a>
      </div>
    </header>
  );
}

export default memo(Header);
