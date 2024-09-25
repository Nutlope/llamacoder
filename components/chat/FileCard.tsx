import Image from 'next/image'
import React, { FC } from 'react'

type TFileCardProps = {
  onViewFile: () => void;
}

const FileCard: FC<TFileCardProps> = ({ onViewFile }) => {
  return (
    <div className="group relative mt-3 cursor-pointer" onClick={onViewFile}>
      <div className="bg-gray-300/50 absolute -inset-1 rounded-1.5" />
      <div className="shadow-card relative flex min-w-80 items-center justify-between rounded-1.5 bg-white p-1.5 transition-all duration-300 ease-in-out group-hover:bg-[#E5E9EF]">
        <div className="flex items-center gap-3">
          <div className="bg-frost-gray rounded-0.5 flex h-8 w-8 items-center justify-center transition-all duration-300 ease-in-out group-hover:bg-white">
            <Image
              src="/code-browser.svg"
              alt="code"
              width={20}
              height={20}
              className="h-5 w-5"
            />
          </div>

          <div className="">
            <h3 className="text-sm text-midnight-100">Calculator</h3>
            <p className="text-xs font-light text-midnight-100">
              Calculator.tsx
            </p>
          </div>
        </div>
        <Image
          src="/arrow-right.svg"
          alt="code"
          width={14}
          height={14}
          className="mr-1 h-3.5 w-3.5"
        />
      </div>
    </div>
  )
}

export default FileCard