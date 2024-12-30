"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { ReactNode } from "react";

export default function CodeViewerLayout({
  children,
  isShowing,
  onClose,
}: {
  children: ReactNode;
  isShowing: boolean;
  onClose: () => void;
}) {
  const isMobile = useMediaQuery("(max-width: 1023px)");

  return (
    <>
      {isMobile ? (
        <Drawer open={isShowing} onClose={onClose}>
          <DrawerContent>
            <VisuallyHidden.Root>
              <DrawerTitle>Code</DrawerTitle>
              <DrawerDescription>Description</DrawerDescription>
            </VisuallyHidden.Root>

            <div className="flex h-[90vh] flex-col overflow-y-scroll">
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <div
          className={`${isShowing ? "w-1/2" : "w-0"} hidden h-full overflow-hidden py-5 transition-[width] lg:block`}
        >
          <div className="ml-4 flex h-full flex-col rounded-l-xl shadow-lg shadow-gray-400/40">
            <div className="flex h-full flex-col rounded-l-xl shadow shadow-gray-800/50">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
