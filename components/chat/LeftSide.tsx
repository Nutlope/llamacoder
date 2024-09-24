// "use client";

// import { Button } from "@/components/ui/button";
// import {
//   Sheet,
//   SheetClose,
//   SheetContent,
//   SheetDescription,
//   SheetFooter,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from "@/components/ui/sheet";
// import Header from "../Header";
// import Image from "next/image";


// export default function SheetSide({children}: Readonly<{children: React.ReactNode}>) {
//   return (

//       <Sheet key="left">
//         <SheetTrigger asChild>
//           {children}
//         </SheetTrigger>
//         <SheetContent side="left" className="w-[283px]">
//           <SheetHeader className="m-0">
//             <Header className="m-0 justify-start p-0 sm:p-0" />
//           </SheetHeader>
//           <div className="grid gap-4 py-4">
//             <p className="text-xs font-light uppercase text-black">
//               recent chats
//             </p>
//            <div className="flex flex-col">
//            {[1, 2, 3, 4, 5].map((i) => (
//               <div
//                 key={i}
//                 className="flex w-full items-center justify-between gap-2.5 px-2.5 py-2 rounded-[2px] bg-white transition-all duration-200 ease-linear hover:bg-[#F4F4F5] "
//               >
//                 <p className="text-sm">Calculator app</p>
//                 <div className="">
//                   <Image
//                     src={"/trash.svg"}
//                     alt={"trash"}
//                     width={12}
//                     height={12}
//                     className="h-3 w-3"
//                   />
//                 </div>
//               </div>
//             ))}
//            </div>
//           </div>
//           <SheetFooter>
//             <SheetClose asChild>
//               <Button type="submit">Save changes</Button>
//             </SheetClose>
//           </SheetFooter>
//         </SheetContent>
//       </Sheet>

//   );
// }
