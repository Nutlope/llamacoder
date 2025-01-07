import Image from "next/image";

import GithubIcon from "@/components/icons/github-icon";
import logo from "@/public/logo.png";
import Link from "next/link";

export default function Header() {
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
          className="ml-auto hidden items-center gap-3 rounded-2xl bg-white px-6 py-2 shadow sm:flex"
        >
          <GithubIcon className="h-4 w-4" />
          <span>GitHub Repo</span>
        </a>
      </div>
    </header>
  );
}
