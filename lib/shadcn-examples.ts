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
    response: `
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
    `,
  },
};
