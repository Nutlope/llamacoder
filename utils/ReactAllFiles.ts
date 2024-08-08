import packageJson from "./packageJson";
import IndexFile from "./IndexFile";


const ReactAllFiles = (name: string, desc: string, dependencies: any) => {
  return {
    "package.json": packageJson(name, desc, dependencies),
    "src/index.tsx": IndexFile(),
    "README.md":  `
    # ${name}
    
    This is a simple React application.
    
    ## Table of Contents
    
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Running the App](#running-the-app)
    - [Building the App](#building-the-app)
    - [Deployment](#deployment)
    
    ## Prerequisites
    
    Before you begin, ensure you have met the following requirements:
    
    - You have installed [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) (Node Package Manager).
    - You have a terminal or command prompt to run commands.
    
    ## Installation
    
    To install the dependencies and set up the project, follow these steps:
    
    1. Navigate to the project directory (if you haven't done so already).
    
    2. Install the dependencies:
    
        \`\`\`bash
        npm install
        \`\`\`
    
    ## Running the App
    
    To run the app locally, follow these steps:
    
    1. Start the development server:
    
        \`\`\`bash
        npm start
        \`\`\`
    
    2. Open your browser and navigate to:
    
        \`\`\`
        http://localhost:3000
        \`\`\`
    
    ## Building the App
    
    To create a production build of the app, follow these steps:
    
    1. Build the app:
    
        \`\`\`bash
        npm run build
        \`\`\`
    
    2. The production-ready files will be in the \`build\` directory.
    
    ## Deployment
    
    To deploy the app, you can use any static site hosting service such as [Netlify](https://www.netlify.com/), [Vercel](https://vercel.com/), or [GitHub Pages](https://pages.github.com/).
    
    ### Deploying to Replit
    
    To deploy this React app to Replit, follow these steps:
    
    1. Create a new Repl on [Replit](https://replit.com/).
    
    2. Choose the Node.js template.
    
    3. Link your GitHub repository or upload the project files.
    
    4. Install the dependencies:
    
        \`\`\`bash
        npm install
        \`\`\`
    
    5. Start the server:
    
        \`\`\`bash
        npm start
        \`\`\`
    
    6. Your app should now be running on Replit. You can share the Replit URL with others.
    
    
    `,
  };
};


export default ReactAllFiles;