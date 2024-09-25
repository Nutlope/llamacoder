import Image from "next/image";
import React, { Dispatch, FC, SetStateAction } from "react";
import FileCard from "./FileCard";

type TPrompResponseProps = {
  setIsFileViewOpen: Dispatch<SetStateAction<boolean>>;
};

const PromptResponse: FC<TPrompResponseProps> = ({ setIsFileViewOpen }) => {
  return (
    <div className="flex flex-col items-start gap-5">
      {/* input prompt */}
      <div className="flex items-center gap-2">
        <Image
          src={"/rectangle.png"}
          alt="rectangle"
          width={13}
          height={13}
          className="h-3.5 w-3.5"
        />
        <p className="text-sm italic text-midnight-100">
          make me a calculator app
        </p>
      </div>

      {/* response */}
      <p className="text-sm text-midnight">
        I&apos;ll create a simple calculator app using React. This calculator
        will support basic arithmetic operations (addition, subtraction,
        multiplication, and division) and will have a clean, modern interface.
      </p>
      <p className="text-sm text-midnight">
        {" "}
        Here&apos;s the React component for the calculator app:
      </p>

      {/* file card */}
      <FileCard
        onViewFile={() => setIsFileViewOpen((prev: boolean) => !prev)}
      />

      <p className="text-sm text-midnight">
        This calculator app includes the following features:
      </p>
      <ol className="ml-5 list-decimal text-sm text-midnight">
        <li>A display area showing the current calculation or result.</li>
        <li>
          Buttons for numbers 0-9, decimal point, and basic arithmetic
          operations (addition, subtraction, multiplication, and division).
        </li>
        <li>A clear button to reset the calculator.</li>

        <li>An equals button to perform the calculation.</li>
        <li>Error handling for division by zero.</li>
        <li>A responsive layout that works well on various screen sizes.</li>
      </ol>
      <div className="flex w-full items-center justify-end gap-2">
        <button className="">
          <Image
            src={"/copy.svg"}
            alt="copy"
            width={14}
            height={14}
            className="h-4 w-4"
          />
        </button>
        <button className="">
          <Image
            src={"/refresh.svg"}
            alt="refresh"
            width={14}
            height={14}
            className="h-4 w-4"
          />
        </button>
        <button className="">
          <Image
            src={"/like.svg"}
            alt="like"
            width={14}
            height={14}
            className="h-4 w-4"
          />
        </button>
        <button className="">
          <Image
            src={"/unlike.svg"}
            alt="unlike"
            width={14}
            height={14}
            className="h-4 w-4"
          />
        </button>
      </div>
    </div>
  );
};

export default PromptResponse;
