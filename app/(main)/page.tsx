import Header from "@/components/header";
import bgImg from "@/public/halo.png";
import Image from "next/image";
import Link from "next/link";

import PromptForm from "./prompt-form";

export default function Home() {
  return (
    <div className="relative flex grow flex-col">
      <div className="absolute inset-0 flex justify-center">
        <Image
          src={bgImg}
          alt=""
          className="max-h-[953px] w-full max-w-[1200px] object-cover object-top mix-blend-screen"
          sizes="(max-width: 1200px) 100vw, 1200px"
          quality={50}
          preload
        />
      </div>

      <div className="isolate flex h-full grow flex-col">
        <Header />

        <main className="mt-10 flex grow flex-col items-center px-4 lg:mt-16">
          <a
            className="mb-4 inline-flex shrink-0 items-center rounded-full border-[0.5px] border-[#BABABA] px-3.5 py-1.5 text-xs text-black transition-shadow"
            href="https://togetherai.link/?utm_source=llamacoder&utm_medium=referral&utm_campaign=example-app"
            target="_blank"
            rel="noreferrer"
          >
            <span className="text-center">
              Powered by <span className="font-semibold">Together AI</span>.
              Used by <span className="font-semibold">1.1M+ users.</span>
            </span>
          </a>

          <h1 className="mt-4 text-balance text-center text-4xl leading-none text-gray-700 md:text-[64px] lg:mt-8">
            Turn your <span className="text-blue-500">idea</span>
            <br className="hidden md:block" /> into an{" "}
            <span className="text-blue-500">app</span>
          </h1>

          <PromptForm />
        </main>

        <Footer />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="flex w-full flex-col items-center justify-between space-y-3 px-5 pb-3 pt-5 text-center sm:flex-row sm:pt-2">
      <div className="font-medium">
        Built with{" "}
        <a
          href="https://togetherai.link/?utm_source=llamacoder&utm_medium=referral&utm_campaign=example-app"
          className="font-semibold text-blue-600 underline-offset-4 transition-colors hover:text-gray-700 hover:underline"
        >
          Llama
        </a>{" "}
        and{" "}
        <a
          href="https://togetherai.link/?utm_source=llamacoder&utm_medium=referral&utm_campaign=example-app"
          className="font-semibold text-blue-600 underline-offset-4 transition-colors hover:text-gray-700 hover:underline"
        >
          Together AI
        </a>
        .
      </div>

      <div className="flex items-center gap-4 pb-4 sm:pb-0">
        <Link
          href="https://x.com/nutlope"
          className="group"
          aria-label="Nutlope on X"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 fill-slate-500 group-hover:fill-slate-700"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.7465 16L6.8829 10.2473L2.04622 16H0L5.97508 8.89534L0 0H5.25355L8.8949 5.42183L13.4573 0H15.5036L9.80578 6.77562L16 16H10.7465ZM13.0252 14.3782H11.6475L2.92988 1.62182H4.30767L7.79916 6.72957L8.40293 7.6159L13.0252 14.3782Z"
            />
          </svg>
        </Link>
        <Link
          href="https://github.com/Nutlope/llamacoder"
          className="group"
          aria-label="LlamaCoder source code on GitHub"
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700"
          >
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
          </svg>
        </Link>
      </div>
    </footer>
  );
}

export const maxDuration = 60;
