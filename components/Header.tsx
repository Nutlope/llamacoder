import Image from "next/image";
import Link from "next/link";
import logo from "../public/logo.png";
import GithubIcon from "./github-icon";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  return (
    <header className="relative mx-auto mt-5 flex w-full items-center justify-center px-2 pb-7 sm:px-4">
      <Link href="/" className="absolute flex items-center gap-2">
        <Image alt="header text" src={logo} className="h-5 w-5" />
        <h1 className="text-xl tracking-tight text-gray-900 dark:text-dark-primary">
          <span className="text-blue-600 dark:text-dark-accent">Llama</span>Coder
        </h1>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <a
          href="https://github.com/nutlope/llamacoder"
          target="_blank"
          className="hidden items-center gap-3 rounded-2xl bg-white px-6 py-2 hover:bg-gray-50 dark:bg-dark-background-secondary dark:border dark:border-dark-accent dark:hover:bg-dark-background-tertiary sm:flex"
        >
          <GithubIcon className="h-4 w-4" />
          <span className="dark:text-dark-primary">GitHub Repo</span>
        </a>
      </div>
    </header>
  );
}
