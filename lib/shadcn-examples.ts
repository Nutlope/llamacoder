import dedent from "dedent";

export const examples = {
  "landing page": {
    prompt: "Build a landing page for a healthcare company",
    response: `
    import React from 'react';
import { Button } from "/components/ui/button"
import { Card, CardContent } from "/components/ui/card"
import { Heart, Shield, Clock, Users } from "lucide-react"

export default function HealthcareLandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <a className="flex items-center justify-center" href="#">
          <Heart className="h-6 w-6 text-primary" />
          <span className="sr-only">HealthCare Co.</span>
        </a>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#">
            Services
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#">
            About
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#">
            Contact
          </a>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Your Health, Our Priority
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Providing compassionate care and cutting-edge medical solutions to improve your quality of life.
                </p>
              </div>
              <div className="space-x-4">
                <Button>Book Appointment</Button>
                <Button variant="outline">Learn More</Button>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-8">Our Services</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                  <Shield className="h-12 w-12 text-primary" />
                  <h3 className="text-xl font-bold">Preventive Care</h3>
                  <p className="text-gray-500 dark:text-gray-400">Regular check-ups and screenings to keep you healthy.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                  <Users className="h-12 w-12 text-primary" />
                  <h3 className="text-xl font-bold">Family Medicine</h3>
                  <p className="text-gray-500 dark:text-gray-400">Comprehensive care for patients of all ages.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                  <Clock className="h-12 w-12 text-primary" />
                  <h3 className="text-xl font-bold">24/7 Emergency</h3>
                  <p className="text-gray-500 dark:text-gray-400">Round-the-clock care for urgent medical needs.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                  <Heart className="h-12 w-12 text-primary" />
                  <h3 className="text-xl font-bold">Specialized Care</h3>
                  <p className="text-gray-500 dark:text-gray-400">Expert treatment for complex health conditions.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-8">What Our Patients Say</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-2">
                    <p className="text-gray-500 dark:text-gray-400">
                      "The care I received was exceptional. The staff was friendly and professional, and the doctors took the time to listen to my concerns."
                    </p>
                    <div className="flex items-center space-x-2">
                      <img
                        src="github.com/nutlope.png"
                        alt="Patient"
                        className="rounded-full"
                        width={40}
                        height={40}
                      />
                      <div>
                        <p className="font-medium">Jane Doe</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Patient</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Ready to Prioritize Your Health?</h2>
                <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                  Book an appointment today and take the first step towards a healthier you.
                </p>
              </div>
              <Button size="lg">Book Appointment Now</Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2023 HealthCare Co. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <a className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </a>
          <a className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </a>
        </nav>
      </footer>
    </div>
  )
}
    `,
  },
  "blog app": {
    prompt: "make me a personal blog",
    response: `
    import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "/components/ui/card"
import { Button } from "/components/ui/button"
import { ArrowLeft } from 'lucide-react'

// Sample blog post data with full content
const blogPosts = [
  {
    id: 1,
    title: "Getting Started with Next.js",
    excerpt: "Learn how to build modern web applications with Next.js",
    date: "2023-06-01",
    readTime: "5 min read",
    content: "Next.js is a powerful React framework that makes it easy to build fast, SEO-friendly web applications.
Here are some key features of Next.js:

      1. Server-Side Rendering (SSR): Next.js can render React components on the server, which improves initial load time and SEO.
      2. Static Site Generation (SSG): You can generate static HTML files at build time for even faster loading.
      3. API Routes: Next.js allows you to create API endpoints as part of your application.
      4. File-based Routing: Simply create files in the 'pages' directory to define routes.
      5. Built-in CSS Support: Next.js supports CSS Modules, Sass, and other styling options out of the box.

      To get started with Next.js, you can use the following command: npx create-next-app@latest my-next-app"
  },
  {
    id: 2,
    title: "The Power of Tailwind CSS",
    excerpt: "Discover how Tailwind CSS can streamline your styling workflow",
    date: "2023-06-05",
    readTime: "4 min read",
    content: \`
      Tailwind CSS is a utility-first CSS framework that can significantly speed up your development process.
      Instead of writing custom CSS, you apply pre-existing classes directly in your HTML.

      Key benefits of Tailwind CSS include:

      1. Rapid Development: With utility classes, you can quickly style elements without switching between HTML and CSS files.
      2. Consistency: Tailwind provides a set of pre-defined design tokens, ensuring consistency across your project.
      3. Customization: You can easily customize the default configuration to match your design system.
      4. Responsive Design: Tailwind includes responsive utility variants, making it simple to create responsive layouts.
      5. Smaller File Sizes: When properly configured, Tailwind can eliminate unused CSS, resulting in smaller file sizes.

      To start using Tailwind CSS in your project, you can install it with npm: npm install tailwindcss

      Then, add the Tailwind directives to your CSS file and start using the utility classes in your HTML. Enjoy the power of Tailwind!
    \`


  },
  {
    id: 3,
    title: "React Hooks Explained",
    excerpt: "Dive deep into React Hooks and how they can simplify your components",
    date: "2023-06-10",
    readTime: "6 min read",
    content: \`
      React Hooks are functions that allow you to use state and other React features in functional components.
      They were introduced in React 16.8 and have revolutionized how we write React components.

      Some of the most commonly used hooks are:

      1. useState: Allows you to add state to functional components.
      2. useEffect: Lets you perform side effects in functional components.
      3. useContext: Provides a way to pass data through the component tree without manually passing props.
      4. useReducer: An alternative to useState for managing complex state logic.
      5. useCallback and useMemo: Help optimize performance by memoizing functions and values.

      Here's a simple example using useState and useEffect:

      Hooks simplify your components and make it easier to reuse stateful logic between components.
    \`
  },
  {
    id: 4,
    title: "Building Accessible Web Apps",
    excerpt: "Learn best practices for creating inclusive and accessible web applications",
    date: "2023-06-15",
    readTime: "7 min read",
    content: \`
      Creating accessible web applications is crucial for ensuring that all users, including those with disabilities,
      can use your website effectively. Here are some key principles to follow:

      1. Semantic HTML: Use appropriate HTML elements for their intended purpose. For example, use <button> for buttons and <a> for links.
      2. ARIA attributes: When necessary, use ARIA (Accessible Rich Internet Applications) attributes to provide additional context to screen readers.
      3. Keyboard Navigation: Ensure that all interactive elements can be accessed and operated using only a keyboard.
      4. Color Contrast: Make sure there's sufficient color contrast between text and background for readability.
      5. Alternative Text: Provide alt text for images to describe their content to users who can't see them.
      6. Focus Management: Properly manage focus, especially in single-page applications and dynamic content.
      7. Responsive Design: Create layouts that adapt to different screen sizes and orientations.

      Remember, accessibility is not just about complying with guidelines—it's about creating a better user experience for everyone.
    \`
  }
]

export default function Blog() {
  const [selectedPost, setSelectedPost] = useState(null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Awesome Blog</h1>
          <nav>
            <ul className="flex space-x-4">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li><Link href="/about" className="hover:underline">About</Link></li>
              <li><Link href="/contact" className="hover:underline">Contact</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {selectedPost ? (
          <div>
            <Button
              variant="outline"
              onClick={() => setSelectedPost(null)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to all posts
            </Button>
            <h2 className="text-3xl font-bold mb-2">{selectedPost.title}</h2>
            <p className="text-muted-foreground mb-4">{selectedPost.date} · {selectedPost.readTime}</p>
            <div className="prose max-w-none">
              {selectedPost.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-6">Latest Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{post.excerpt}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {post.date} · {post.readTime}
                    </div>
                    <Button variant="outline" onClick={() => setSelectedPost(post)}>Read More</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted mt-8">
        <div className="container mx-auto px-4 py-6 text-center">
          <p>&copy; 2023 My Awesome Blog. All rights reserved.</p>
          <div className="mt-2">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:underline mr-4">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:underline">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
    `,
  },
  "calculator app": {
    prompt: "make me a calculator app",
    response: dedent(`
    I'll create a calculator app using React. This calculator will support basic arithmetic operations: addition, subtraction, multiplication, and division. Let's break it down into components and implement the functionality.

    \`\`\`tsx{filename=calculator.tsx}
    import { useState } from 'react'
    import { Button } from "/components/ui/button"
    import { Card, CardContent, CardHeader, CardTitle } from "/components/ui/card"

    export default function Calculator() {
      const [display, setDisplay] = useState('0')
      const [firstOperand, setFirstOperand] = useState<number | null>(null)
      const [operator, setOperator] = useState<string | null>(null)
      const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false)

      const inputDigit = (digit: string) => {
        if (waitingForSecondOperand) {
          setDisplay(digit)
          setWaitingForSecondOperand(false)
        } else {
          setDisplay(display === '0' ? digit : display + digit)
        }
      }

      const inputDecimal = () => {
        if (waitingForSecondOperand) {
          setDisplay('0.')
          setWaitingForSecondOperand(false)
          return
        }

        if (!display.includes('.')) {
          setDisplay(display + '.')
        }
      }

      const clear = () => {
        setDisplay('0')
        setFirstOperand(null)
        setOperator(null)
        setWaitingForSecondOperand(false)
      }

      const performOperation = (nextOperator: string) => {
        const inputValue = parseFloat(display)

        if (firstOperand === null) {
          setFirstOperand(inputValue)
        } else if (operator) {
          const result = calculate(firstOperand, inputValue, operator)
          setDisplay(String(result))
          setFirstOperand(result)
        }

        setWaitingForSecondOperand(true)
        setOperator(nextOperator)
      }

      const calculate = (firstOperand: number, secondOperand: number, operator: string) => {
        switch (operator) {
          case '+':
            return firstOperand + secondOperand
          case '-':
            return firstOperand - secondOperand
          case '*':
            return firstOperand * secondOperand
          case '/':
            return firstOperand / secondOperand
          default:
            return secondOperand
        }
      }

      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-4 bg-gray-100 p-2 rounded mb-2">
                <div className="text-right text-2xl font-bold">{display}</div>
              </div>
              <Button onClick={() => clear()}>C</Button>
              <Button onClick={() => inputDigit('7')}>7</Button>
              <Button onClick={() => inputDigit('8')}>8</Button>
              <Button onClick={() => inputDigit('9')}>9</Button>
              <Button onClick={() => performOperation('/')}>/</Button>
              <Button onClick={() => inputDigit('4')}>4</Button>
              <Button onClick={() => inputDigit('5')}>5</Button>
              <Button onClick={() => inputDigit('6')}>6</Button>
              <Button onClick={() => performOperation('*')}>*</Button>
              <Button onClick={() => inputDigit('1')}>1</Button>
              <Button onClick={() => inputDigit('2')}>2</Button>
              <Button onClick={() => inputDigit('3')}>3</Button>
              <Button onClick={() => performOperation('-')}>-</Button>
              <Button onClick={() => inputDigit('0')}>0</Button>
              <Button onClick={() => inputDecimal()}>.</Button>
              <Button onClick={() => performOperation('=')}>=</Button>
              <Button onClick={() => performOperation('+')}>+</Button>
            </div>
          </CardContent>
        </Card>
      )
    }
    \`\`\`

    This calculator component provides a simple and functional interface for basic arithmetic operations. Here's a breakdown of its features:

    1. Display: Shows the current input or result.
    2. Digit buttons: Allow users to input numbers.
    3. Operation buttons: +, -, *, and / for basic arithmetic operations.
    4. Clear button (C): Resets the calculator.
    5. Decimal point button: Allows input of decimal numbers.
    6. Equals button (=): Performs the calculation.

    The component uses React's useState hook to manage the state of the display, operands, and current operation. The logic handles both immediate execution of operations and chaining of multiple operations."
    `),
  },
  "quiz app": {
    prompt:
      "Make me a quiz app about American history. Make sure to give the user an explanation on each question whether they got it right or wrong and keep a score going",
    response: dedent(`
      I'll create an interactive quiz app about American history with feedback and scoring functionality.

\`\`\`tsx{filename=history-quiz.tsx}
import { useState } from 'react'
import { Button } from "/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "/components/ui/card"

type Question = {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export default function HistoryQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  const questions: Question[] = [
    {
      question: "In which year was the Declaration of Independence signed?",
      options: ["1774", "1775", "1776", "1777"],
      correctAnswer: "1776",
      explanation: "The Declaration of Independence was signed on July 4, 1776, marking the formal separation of the 13 American colonies from Great Britain."
    },
    {
      question: "Who was the first President of the United States?",
      options: ["John Adams", "Thomas Jefferson", "Benjamin Franklin", "George Washington"],
      correctAnswer: "George Washington",
      explanation: "George Washington served as the first President from 1789 to 1797 and is often called the 'Father of His Country'."
    },
    {
      question: "Which war was fought between the North and the South United States?",
      options: ["Revolutionary War", "Civil War", "War of 1812", "Spanish-American War"],
      correctAnswer: "Civil War",
      explanation: "The Civil War (1861-1865) was fought between the Union (North) and the Confederacy (South) primarily over slavery and states' rights."
    },
    {
      question: "What was the name of the first successful English settlement in America?",
      options: ["Plymouth", "Jamestown", "Roanoke", "Massachusetts Bay"],
      correctAnswer: "Jamestown",
      explanation: "Jamestown, founded in 1607 in Virginia, was the first permanent English settlement in North America."
    },
    {
      question: "Which amendment to the Constitution abolished slavery?",
      options: ["13th", "14th", "15th", "16th"],
      correctAnswer: "13th",
      explanation: "The 13th Amendment, ratified in 1865, abolished slavery and involuntary servitude throughout the United States."
    }
  ]

  const handleAnswer = (selectedOption: string) => {
    setSelectedAnswer(selectedOption)
    setShowExplanation(true)

    if (selectedOption === questions[currentQuestion].correctAnswer) {
      setScore(score + 1)
    }
  }

  const nextQuestion = () => {
    setSelectedAnswer(null)
    setShowExplanation(false)
    setCurrentQuestion(currentQuestion + 1)
  }

  const resetQuiz = () => {
    setCurrentQuestion(0)
    setScore(0)
    setShowExplanation(false)
    setSelectedAnswer(null)
  }

  if (currentQuestion >= questions.length) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xl text-center">
            Your final score: {score} out of {questions.length}
          </p>
          <div className="text-center">
            <Button onClick={resetQuiz}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-2xl">American History Quiz</CardTitle>
        <p className="text-gray-500">Question {currentQuestion + 1} of {questions.length}</p>
        <p className="text-gray-500">Score: {score}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <h2 className="text-xl font-semibold">{questions[currentQuestion].question}</h2>
        <div className="grid grid-cols-1 gap-3">
          {questions[currentQuestion].options.map((option) => (
            <Button
              key={option}
              onClick={() => handleAnswer(option)}
              variant={
                showExplanation
                  ? option === questions[currentQuestion].correctAnswer
                    ? 'default'
                    : option === selectedAnswer
                    ? 'destructive'
                    : 'outline'
                  : 'outline'
              }
              disabled={showExplanation}
              className="p-4 text-left"
            >
              {option}
            </Button>
          ))}
        </div>

        {showExplanation && (
          <div className="mt-4 p-4 rounded-lg bg-gray-100">
            <p className="font-semibold">
              {selectedAnswer === questions[currentQuestion].correctAnswer
                ? '✅ Correct!'
                : '❌ Incorrect!'}
            </p>
            <p className="mt-2">{questions[currentQuestion].explanation}</p>
            <Button onClick={nextQuestion} className="mt-4">
              Next Question
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
      \`\`\`

This quiz app includes the following features:

1. Five questions about American history
2. Multiple choice answers
3. Immediate feedback on whether the answer was correct or wrong
4. Detailed explanations for each question
5. Score tracking throughout the quiz
6. A final score display at the end
7. Option to retry the quiz
8. Visual feedback with different button colors for correct/incorrect answers
9. Progress tracking (current question number)

The app uses:

- Shadcn UI components for consistent styling
- React state management for handling the quiz flow
- TypeScript for type safety
- Responsive design that works well on both mobile and desktop
- Clear visual hierarchy and spacing
- Intuitive user interface with disabled buttons after selection
- Comprehensive feedback system

The questions cover various important aspects of American history, from the founding of the nation to constitutional amendments, making it both educational and engaging.
      `),
  },
  "pomodoro timer": {
    prompt: "make a pomodoro timer",
    response: dedent(`
      I'll create a Pomodoro timer with adjustable focus and break times, along with a sound notification when the timer completes. Since no reference image/app was provided in your prompt, I'll create a clean and functional design.

      \`\`\`tsx{filename=pomodoro-timer.tsx}
      import { useState, useEffect } from 'react'
import { Button } from "/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "/components/ui/card"
import { Play, Pause, X } from "lucide-react"

export default function PomodoroTimer() {
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [isActive, setIsActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [focusTime, setFocusTime] = useState(25)
  const [breakTime, setBreakTime] = useState(5)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((timeLeft) => timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      playSound()
      if (mode === 'focus') {
        setMode('break')
        setTimeLeft(breakTime * 60)
      } else {
        setMode('focus')
        setTimeLeft(focusTime * 60)
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft, mode, focusTime, breakTime])

  const toggleTimer = () => {
    setIsActive(!isActive)
  }

  const resetTimer = () => {
    setIsActive(false)
    setMode('focus')
    setTimeLeft(focusTime * 60)
  }

  const playSound = () => {
    const audio = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=')
    audio.play()
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return \`\${mins.toString().padStart(2, "0")}:\${secs.toString().padStart(2, "0")}\`
  }

  const adjustTime = (type: 'focus' | 'break', amount: number) => {
    if (type === 'focus') {
      const newTime = Math.max(1, Math.min(60, focusTime + amount))
      setFocusTime(newTime)
      if (mode === 'focus') setTimeLeft(newTime * 60)
    } else {
      const newTime = Math.max(1, Math.min(15, breakTime + amount))
      setBreakTime(newTime)
      if (mode === 'break') setTimeLeft(newTime * 60)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Pomodoro Timer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center space-x-4">
            <Button
              variant={mode === 'focus' ? 'default' : 'outline'}
              onClick={() => {
                setMode('focus')
                setTimeLeft(focusTime * 60)
                setIsActive(false)
              }}
            >
              Focus
            </Button>
            <Button
              variant={mode === 'break' ? 'default' : 'outline'}
              onClick={() => {
                setMode('break')
                setTimeLeft(breakTime * 60)
                setIsActive(false)
              }}
            >
              Break
            </Button>
          </div>

          <div className="text-center">
            <div className="text-6xl font-bold mb-8">{formatTime(timeLeft)}</div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Focus Time</p>
                <div className="flex justify-center items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustTime('focus', -1)}
                  >
                    -
                  </Button>
                  <span className="w-16 text-center">{focusTime}m</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustTime('focus', 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Break Time</p>
                <div className="flex justify-center items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustTime('break', -1)}
                  >
                    -
                  </Button>
                  <span className="w-16 text-center">{breakTime}m</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustTime('break', 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                size="lg"
                onClick={toggleTimer}
                className="w-32"
              >
                {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isActive ? 'Pause' : 'Start'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={resetTimer}
                className="w-32"
              >
                <X className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    \`\`\`
    `),
  },
};
