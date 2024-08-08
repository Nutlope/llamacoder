import { notFound } from "next/navigation";
import CodeViewer from "./code-viewer";

async function getCode(id: string) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return sampleCode;
}

export default async function Page({ params }: { params: { id: string } }) {
  // if process.env.DATABASE_URL is not set, throw an error
  if (typeof params.id !== "string") {
    notFound();
  }

  let code = await getCode(params.id);

  return <CodeViewer code={code} />;
}

let sampleCode = `
import React, { useState } from 'react';

interface CalculatorState {
  currentNumber: string;
  previousNumber: string;
  operation: string;
}

const Calculator: React.FC = () => {
  const [state, setState] = useState<CalculatorState>({
    currentNumber: '0',
    previousNumber: '',
    operation: '',
  });

  const handleNumberClick = (number: string) => {
    if (state.currentNumber === '0') {
      setState({ ...state, currentNumber: number });
    } else {
      setState({ ...state, currentNumber: state.currentNumber + number });
    }
  };

  const handleOperationClick = (operation: string) => {
    setState({
      previousNumber: state.currentNumber,
      currentNumber: '0',
      operation,
    });
  };

  const handleEqualsClick = () => {
    let result: number;
    switch (state.operation) {
      case '+':
        result = parseFloat(state.previousNumber) + parseFloat(state.currentNumber);
        break;
      case '-':
        result = parseFloat(state.previousNumber) - parseFloat(state.currentNumber);
        break;
      case '*':
        result = parseFloat(state.previousNumber) * parseFloat(state.currentNumber);
        break;
      case '/':
        result = parseFloat(state.previousNumber) / parseFloat(state.currentNumber);
        break;
      default:
        result = 0;
    }
    setState({ ...state, currentNumber: result.toString() });
  };

  const handleClearClick = () => {
    setState({
      currentNumber: '0',
      previousNumber: '',
      operation: '',
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 rounded shadow-md">
      <div className="flex justify-end mb-4">
        <p className="text-3xl">{state.currentNumber}</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('7')}
        >
          7
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('8')}
        >
          8
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('9')}
        >
          9
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleOperationClick('/')}
        >
          /
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('4')}
        >
          4
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('5')}
        >
          5
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('6')}
        >
          6
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleOperationClick('*')}
        >
          *
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('1')}
        >
          1
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('2')}
        >
          2
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('3')}
        >
          3
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleOperationClick('-')}
        >
          -
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleNumberClick('0')}
        >
          0
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={handleClearClick}
        >
          C
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={handleEqualsClick}
        >
          =
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded"
          onClick={() => handleOperationClick('+')}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Calculator;
`;
