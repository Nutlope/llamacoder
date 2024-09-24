import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mb-5 mt-5 flex h-16 w-full flex-col items-center justify-between px-3 pt-4 text-center sm:mb-0 sm:h-20 sm:flex-row sm:pt-2 gap-2.5">
      <div className="order-2 sm:order-1">
        <div className="font-light text-xs text-midnight italic">
        Powered by{" "}
          <a
            href="https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup"
            // className="font-semibold text-blue-600 underline-offset-4 transition hover:text-gray-700 hover:underline"
          >
            Llama 3.1 
          </a>{" "}
         <span className="font-medium"> &{" "}</span>
          <a
            href="https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup"
            // className="font-semibold text-blue-600 underline-offset-4 transition hover:text-gray-700 hover:underline"
          >
            Together AI
          </a>
          .
        </div>
      </div>
      <div className="flex space-x-4 order-1 sm:order-2">
        <Link
          href="https://twitter.com/nutlope"
          className="group rounded py-1 px-1.5 flex gap-1 items-center border-[0.3px] border-steel-gray"
          aria-label=""
        >
          <Image src="/x.svg" alt={"github"} width={11} height={11} className="w-3 h-3" />
          <span className="text-xs text-midnight">Twitter</span>
        </Link>
        <Link
          href="https://github.com/Nutlope/llamacoder"
          className="group rounded py-1 px-1.5 flex gap-1 items-center border-[0.3px] border-steel-gray"
          aria-label="TaxPal on GitHub"
        >
         <Image src="/github.svg" alt={"github"} width={11} height={11} className="w-3 h-3" />
         <span className="text-xs text-midnight">Github</span>
        </Link>
      </div>
    </footer>
  );
}
