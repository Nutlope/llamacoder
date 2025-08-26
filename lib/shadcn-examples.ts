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

This is a single cohesive application, so I don't need a todo list. I should first generate design inspiration to create a polished, modern calculator interface, then search the repo to understand the structure, and finally build the calculator.
\`\`\`
${calculator.content}
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
- All within a single file

This is a straightforward request for a single cohesive component - a quiz app. I don't need to use TodoManager since it's one unified feature. I should first understand the codebase structure, then build the quiz app as requested.
Since they want it all in a single file, I'll create a comprehensive quiz component with multiple American history questions, score tracking, and detailed explanations
\`\`\`
${quiz.content}
\`\`\`
      `),
  },
  "pomodoro timer": {
    prompt: "make a pomodoro timer",
    response: dedent(`
      I'll create a Pomodoro timer with adjustable focus and break times, along with a sound notification when the timer completes. Since no reference image/app was provided in your prompt, I'll create a clean and functional design.

\`\`\`
${pomodoro.content}
\`\`\`
    `),
  },
};
