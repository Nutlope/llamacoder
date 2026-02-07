import "server-only";
import dedent from "dedent";
import blog from "./examples/blog.json";
import calculator from "./examples/calculator.json";
import landing from "./examples/landing.json";
import pomodoro from "./examples/pomodoro.json";
import quiz from "./examples/quiz.json";

export const examples = {
  "landing page": {
    prompt:
      "Create a modern, responsive landing page for a fictional SaaS company",
    response: `
\`\`\`
${landing.content}
\`\`\`
`,
  },
  "blog app": {
    prompt: "make me a personal blog",
    response: `
The user wants me to create a personal blog using Next.js with several specific features:

Clean and modern design
About me page
Blog post archive
Contact form
Categories for travel, food, and technology
Responsive design
Commenting system

This is a complex multi-page application with different sections and features. Since this involves multiple distinct systems (blog posts, categories, contact form, commenting system), I should use the TodoManager to break this down into manageable tasks.
First, I should generate design inspiration since the user wants a "clean and modern design" but hasn't provided specific visual requirements. Then I'll search the repo to understand the codebase structure and create a systematic plan.

\`\`\`
${blog.content}
\`\`\`
    `,
  },
  "calculator app": {
    prompt: "make me a calculator app",
    response: dedent(`
The user wants me to build a Next.js calculator application with:

- Basic arithmetic operations (addition, subtraction, multiplication, division)
- User-friendly interface with clear display
- Buttons for each operation
- Decimal number support
- Clear input functionality
- Responsive design for desktop and mobile
- Keyboard shortcuts for enhanced usability
- Proper multi-file structure for maintainability

\`\`\`tsx{path=src/App.tsx}
import Calculator from "./components/Calculator";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="calculator-theme">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Calculator />
      </div>
    </ThemeProvider>
  );
}
\`\`\`

\`\`\`tsx{path=src/components/Calculator.tsx}
${calculator.content}
\`\`\`

\`\`\`ts{path=src/types/calculator.ts}
export type Operation = "+" | "-" | "×" | "÷" | null;

export interface CalculatorState {
  displayValue: string;
  previousValue: number | null;
  operation: Operation;
  waitingForOperand: boolean;
}

export interface CalculatorButton {
  value: string;
  display: string;
  type: "digit" | "operation" | "function" | "equals";
  className?: string;
}
\`\`\`

\`\`\`ts{path=src/utils/calculator.ts}
import { CalculatorState, Operation } from "../types/calculator";

export const performOperation = (
  firstOperand: number,
  secondOperand: number,
  operation: Operation
): number => {
  switch (operation) {
    case "+":
      return firstOperand + secondOperand;
    case "-":
      return firstOperand - secondOperand;
    case "×":
      return firstOperand * secondOperand;
    case "÷":
      return firstOperand / secondOperand;
    default:
      return secondOperand;
  }
};

export const formatDisplay = (value: number): string => {
  // Format the display value to show up to 10 digits
  const stringValue = value.toString();
  if (stringValue.length > 10) {
    return value.toExponential(5);
  }
  return stringValue;
};
\`\`\`
    `),
  },
  "quiz app": {
    prompt:
      "Make me a quiz app about American history. Make sure to give the user an explanation on each question whether they got it right or wrong and keep a score going",
    response: dedent(`
The user wants me to create a quiz app about American history with the following requirements:

- Quiz questions about American history
- Show explanations for each question whether right or wrong
- Keep track of score
- Create a well-structured multi-file application

This is a straightforward app that should be organized into multiple files for better structure and maintainability. I'll create separate files for components, types, and utilities.

\`\`\`tsx{path=src/App.tsx}
${quiz.content.replace("export default function Quiz() {", 'import Quiz from "./components/Quiz";\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-gray-50 py-8">\n      <div className="container mx-auto px-4">\n        <Quiz />\n      </div>\n    </div>\n  );\n')}
\`\`\`

\`\`\`tsx{path=src/components/Quiz.tsx}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
// ... rest of the quiz component code
\`\`\`

\`\`\`ts{path=src/types/quiz.ts}
export type Question = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

export type QuizState = {
  currentQuestionIndex: number;
  score: number;
  answers: number[];
  showExplanation: boolean;
};
\`\`\`
      `),
  },
  "pomodoro timer": {
    prompt: "make a pomodoro timer",
    response: dedent(`
      I'll create a Pomodoro timer with adjustable focus and break times, along with a sound notification when the timer completes. Since no reference image/app was provided in your prompt, I'll create a clean and functional design with a proper multi-file structure.

\`\`\`tsx{path=src/App.tsx}
import PomodoroTimer from "./components/PomodoroTimer";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="pomodoro-theme">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PomodoroTimer />
      </div>
    </ThemeProvider>
  );
}
\`\`\`

\`\`\`tsx{path=src/components/PomodoroTimer.tsx}
${pomodoro.content}
\`\`\`

\`\`\`tsx{path=src/components/ThemeProvider.tsx}
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) as Theme : undefined) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
        
      root.classList.add(systemTheme);
      return;
    }
    
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
    
  return context;
}
\`\`\`

\`\`\`ts{path=src/types/timer.ts}
export type TimerMode = "work" | "shortBreak" | "longBreak";

export interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
}

export interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  isRunning: boolean;
  completedSessions: number;
}
\`\`\`
    `),
  },
};
