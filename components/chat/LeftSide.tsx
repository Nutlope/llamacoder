"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Header from "../Header";
import Image from "next/image";
import Link from "next/link";

export default function SheetSide({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Sheet key="left">
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[283px] flex-col justify-between"
      >
        <div>
          <SheetHeader className="m-0">
            <Header className="m-0 justify-start p-0 sm:p-0" />
          </SheetHeader>
          <div className="grid gap-2 pb-4 pt-14">
            <p className="text-xs font-light uppercase text-black">
              recent chats
            </p>
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map((i) => (
                <Link
                  key={i}
                  href={`/chat/${i}`}
                  className="flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-[2px] bg-white px-2.5 py-2 transition-all duration-200 ease-linear hover:bg-off-white"
                >
                  <p className="text-sm">Calculator app</p>
                  <div className="">
                    <Image
                      src={"/trash.svg"}
                      alt={"trash"}
                      width={12}
                      height={12}
                      className="h-3 w-3"
                    />
                  </div>
                </Link>
              ))}
              <Link href="/chat">
                <Button className="mt-2.5 flex w-full items-center justify-start gap-1.5 rounded bg-primary-blue text-sm italic shadow-button">
                  <Image
                    src="/plus.svg"
                    alt="plus"
                    width={8}
                    height={8}
                    className="h-4 w-4"
                  />
                  Create a new chat
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <SheetFooter className="flex justify-start flex-row space-x-2">
          <div className="flex h-9 flex-1 items-center gap-2.5 rounded-0.5 border border-light-fog bg-off-white px-1.5">
            <Image
              src="/user.png"
              alt="plus"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <p className="text-sm text-midnight">Youssef El Mghari</p>
          </div>
          <SheetClose asChild>
            <button className="flex h-9 w-16 items-center justify-center rounded-0.5 border border-light-fog bg-off-white">
              <Image
                src="/arrow-left.svg"
                alt="right-arrow"
                width={14}
                height={14}
                className="h-3.5 w-3.5"
              />
            </button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
