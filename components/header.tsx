import Image from "next/image";
import { memo } from "react";

import GithubIcon from "@/components/icons/github-icon";
import Link from "next/link";

function Header() {
  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/" className="flex flex-row items-center gap-3">
        <img
          src="/fullLogo.png"
          alt=""
          className="mx-auto h-7 object-contain"
        />
        <svg
          width="1"
          height="20"
          viewBox="0 0 1 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0.25 0V19.5" stroke="#C2C2C2" strokeWidth="0.5" />
        </svg>

        <img
          src="/together.png"
          alt=""
          className="mx-auto h-[24px] object-contain"
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
            <span className="font-semibold text-gray-900">6k stars</span>
          </div>
        </a>
      </div>
    </header>
  );
}

export default memo(Header);
