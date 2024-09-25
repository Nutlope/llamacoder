export const code = `import { useState } from 'react';

interface CalculatorState {
  currentNumber: string;
  previousNumber: string;
  operation: string;
}

const Calculator = () => {
  const [state, setState] = useState<CalculatorState>({
    currentNumber: '0',
    previousNumber: '',
    operation: '',
  });

  const handleNumberClick = (number: string) => {
    setState((prevState) => ({
      ...prevState,
      currentNumber: prevState.currentNumber === '0' ? number : prevState.currentNumber + number,
    }));
  };

  const handleOperationClick = (operation: string) => {
    setState((prevState) => ({
      previousNumber: prevState.currentNumber,
      currentNumber: '0',
      operation,
    }));
  };

  const handleEqualsClick = () => {
    const { previousNumber, currentNumber, operation } = state;
    let result: number;

    switch (operation) {
      case '+':
        result = parseFloat(previousNumber) + parseFloat(currentNumber);
        break;
      case '-':
        result = parseFloat(previousNumber) - parseFloat(currentNumber);
        break;
      case '*':
        result = parseFloat(previousNumber) * parseFloat(currentNumber);
        break;
      case '/':
        result = parseFloat(previousNumber) / parseFloat(currentNumber);
        break;
      default:
        result = 0;
    }

    setState({
      currentNumber: result.toString(),
      previousNumber: '',
      operation: '',
    });
  };

  const handleClearClick = () => {
    setState({
      currentNumber: '0',
      previousNumber: '',
      operation: '',
    });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 rounded-md shadow-md">
      <div className="flex justify-end mb-4">
        <p className="text-3xl">{state.currentNumber}</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleClearClick()}
        >
          C
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleOperationClick('/')}
        >
          /
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleOperationClick('*')}
        >
          *
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleOperationClick('-')}
        >
          -
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('7')}
        >
          7
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('8')}
        >
          8
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('9')}
        >
          9
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleOperationClick('+')}
        >
          +
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('4')}
        >
          4
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('5')}
        >
          5
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('6')}
        >
          6
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleEqualsClick()}
        >
          =
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('1')}
        >
          1
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('2')}
        >
          2
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('3')}
        >
          3
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 p-4 rounded-md"
          onClick={() => handleNumberClick('0')}
        >
          0
        </button>
      </div>
    </div>
  );
};

export default Calculator;`;
