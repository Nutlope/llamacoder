# Contributing Guide

Thank you for your interest in contributing to this project! We accept contributions via bug reports, feature requests and pull requests. We also have a roadmap outlined below.

For simple fixes or small items on the roadmap below, feel free to submit a pull request. For anything more complex, please open an issue first to discuss the changes you want to make.

## Running the repo

To run the repo locally, simply `npm install` to install dependencies and then `npm run dev` to run the app.

## Roadmap

- [ ] Add evals with Braintrust
- [ ] Experiment with a prompt rewriter and launch this as well
- [ ] Add dynamic OG images to the specific generations & include the prompt
- [ ] Add a bunch of good examples, and have an LLM call automatically choose which ones to include in the system prompt
- [ ] Look into bolt.new and if I should be using the Stackblitz UI instead
- [ ] New redesign
  - [ ] Encourage best practices by making the input and textarea & having pills to generate apps w/ good prompts
- [ ] Add more customizability in terms of changing the prompt, temperature, ect...
- [ ] Save previous versions so people can go back and forth between the generated ones
- [ ] Could be nice to show a "featured apps" route on the site on /featured. Have a /id/${prompt} dynamic route that can display a bunch of nice example apps in the sandbox ready to go
- [ ] Support more languages starting with Python (like streamlit), check out E2B
- [ ] Try finetuning a smaller model on good prompts from 405b or o1/Claude
- [ ] Add dark mode to the site overall, nice design change
- [ ] Add self-correcting to the app so it can fix its own errors
- [ ] Compressing prompt: Use small model like llama 3.1 70B to retain what happened in the past, good memory management is key
- [ ] New route for updateCode that only sends the latest generated code + the modify request
- [ ] Fix bug where if a user edits the code, then does a change, it doesn't use the edited code
- [ ] Apply code diffs directly instead of asking the model to generate the code from scratch

## License

By contributing, you agree that your contributions will be licensed under the project's license.
