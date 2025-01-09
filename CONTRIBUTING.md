# Contributing Guide

Thank you for your interest in contributing to this project! We accept contributions via bug reports, feature requests and pull requests. We also have a roadmap outlined below.

For simple fixes or small items on the roadmap below, feel free to submit a pull request. For anything more complex, please open an issue first to discuss the changes you want to make.

## Running the repo

To run the repo locally, simply `npm install` to install dependencies and then `npm run dev` to run the app.

## Roadmap

- [ ] Add self-correcting to the app so it can fix its own errors
- [ ] Compressing prompt: Use small model like llama 3.1 70B to retain what happened in the past, good memory management is key
- [ ] Add evals with Braintrust to be able to measure how good the system is over time and when making new changes
- [ ] Add more good examples to the shadcn-examples.ts file (single components that span a whole app and use shadcn)
- [ ] Add dynamic OG images to the specific generations & include the prompt + a screenshot in the image
- [ ] Show a "featured apps" section on /gallery (or have some at the bottom of the homepage as templates). Have a /id/${prompt} dynamic route that can display a bunch of nice example apps in the sandbox ready to go
- [ ] Try finetuning a smaller model on good prompts from deepseek-v2 or o1/Claude
- [ ] Add dark mode to the site overall, nice design change
- [ ] Support more languages starting with Python (like streamlit) and see if I can run them on CSB SDK

## License

By contributing, you agree that your contributions will be licensed under the project's license.
