"use client";

import { useState, useEffect, useCallback } from "react";
// @ts-ignore
import { Button } from "@/components/ui/button";
// @ts-ignore
import { Card } from "@/components/ui/card";

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = useCallback(
    (num: string) => {
      if (waitingForOperand) {
        setDisplay(num);
        setWaitingForOperand(false);
      } else {
        setDisplay(display === "0" ? num : display + num);
      }
    },
    [display, waitingForOperand],
  );

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const performOperation = useCallback(
    (nextOperation: string) => {
      const inputValue = Number.parseFloat(display);

      if (previousValue === null) {
        setPreviousValue(inputValue);
      } else if (operation) {
        const currentValue = previousValue || 0;
        const newValue = calculate(currentValue, inputValue, operation);

        setDisplay(String(newValue));
        setPreviousValue(newValue);
      }

      setWaitingForOperand(true);
      setOperation(nextOperation);
    },
    [display, previousValue, operation],
  );

  const calculate = (
    firstValue: number,
    secondValue: number,
    operation: string,
  ): number => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "×":
        return firstValue * secondValue;
      case "÷":
        return secondValue !== 0 ? firstValue / secondValue : 0;
      default:
        return secondValue;
    }
  };

  const handleEquals = useCallback(() => {
    const inputValue = Number.parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  }, [display, previousValue, operation]);

  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const { key } = event;

      if (key >= "0" && key <= "9") {
        inputNumber(key);
      } else if (key === ".") {
        inputDecimal();
      } else if (key === "+") {
        performOperation("+");
      } else if (key === "-") {
        performOperation("-");
      } else if (key === "*") {
        performOperation("×");
      } else if (key === "/") {
        event.preventDefault();
        performOperation("÷");
      } else if (key === "Enter" || key === "=") {
        handleEquals();
      } else if (key === "Escape" || key === "c" || key === "C") {
        clear();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [inputNumber, inputDecimal, performOperation, handleEquals, clear]);

  const buttonClass =
    "h-16 text-lg font-semibold transition-all duration-150 active:scale-95";
  const numberButtonClass = `${buttonClass} bg-card hover:bg-muted border border-border text-card-foreground`;
  const operationButtonClass = `${buttonClass} bg-secondary hover:bg-secondary/90 text-secondary-foreground`;
  const clearButtonClass = `${buttonClass} bg-destructive hover:bg-destructive/90 text-destructive-foreground`;
  const equalsButtonClass = `${buttonClass} bg-accent hover:bg-accent/90 text-accent-foreground`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-sm">
        <div className="space-y-4">
          {/* Display */}
          <div className="rounded-lg border border-border bg-muted p-4">
            <div className="flex min-h-[2.5rem] items-center justify-end overflow-hidden text-right font-mono text-3xl font-bold text-foreground">
              {display}
            </div>
          </div>

          {/* Button Grid */}
          <div className="grid grid-cols-4 gap-3">
            {/* First Row */}
            <Button
              onClick={clear}
              className={`${clearButtonClass} col-span-2`}
            >
              Clear
            </Button>
            <Button
              onClick={() => performOperation("÷")}
              className={operationButtonClass}
            >
              ÷
            </Button>
            <Button
              onClick={() => performOperation("×")}
              className={operationButtonClass}
            >
              ×
            </Button>

            {/* Second Row */}
            <Button
              onClick={() => inputNumber("7")}
              className={numberButtonClass}
            >
              7
            </Button>
            <Button
              onClick={() => inputNumber("8")}
              className={numberButtonClass}
            >
              8
            </Button>
            <Button
              onClick={() => inputNumber("9")}
              className={numberButtonClass}
            >
              9
            </Button>
            <Button
              onClick={() => performOperation("-")}
              className={operationButtonClass}
            >
              −
            </Button>

            {/* Third Row */}
            <Button
              onClick={() => inputNumber("4")}
              className={numberButtonClass}
            >
              4
            </Button>
            <Button
              onClick={() => inputNumber("5")}
              className={numberButtonClass}
            >
              5
            </Button>
            <Button
              onClick={() => inputNumber("6")}
              className={numberButtonClass}
            >
              6
            </Button>
            <Button
              onClick={() => performOperation("+")}
              className={operationButtonClass}
            >
              +
            </Button>

            {/* Fourth Row */}
            <Button
              onClick={() => inputNumber("1")}
              className={numberButtonClass}
            >
              1
            </Button>
            <Button
              onClick={() => inputNumber("2")}
              className={numberButtonClass}
            >
              2
            </Button>
            <Button
              onClick={() => inputNumber("3")}
              className={numberButtonClass}
            >
              3
            </Button>
            <Button
              onClick={handleEquals}
              className={`${equalsButtonClass} row-span-2`}
            >
              =
            </Button>

            {/* Fifth Row */}
            <Button
              onClick={() => inputNumber("0")}
              className={`${numberButtonClass} col-span-2`}
            >
              0
            </Button>
            <Button onClick={inputDecimal} className={numberButtonClass}>
              .
            </Button>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Keyboard shortcuts: Numbers, +, -, *, /, Enter/=, Esc/C (clear)
        </div>
      </Card>
    </div>
  );
}
