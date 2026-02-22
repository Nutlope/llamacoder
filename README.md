<a href="https://www.llamacoder.io">
  <img alt="Gemini Coder" src="./public/og-image.png">
  <h1 align="center">Gemini Coder</h1>
</a>

<p align="center">
  An open source Claude Artifacts – generate small apps with one prompt. Powered by Gemini AI.
</p>

## Tech stack

- [Gemini 2.0 Flash](https://ai.google.dev/) for the LLM
- [Google AI SDK](https://github.com/google-gemini/generative-ai-js) for LLM inference
- [Sandpack](https://sandpack.codesandbox.io/) for the code sandbox
- Next.js app router with Tailwind
- Local Storage for chat persistence (no database required)

## Cloning & running

1. Clone the repo: `git clone https://github.com/Nutlope/llamacoder`
2. Create a `.env` file and add your API keys:
   - **[Gemini API key](https://aistudio.google.com/)**: `GEMINI_API_KEY=<your_gemini_api_key>`
   - **[CSB API key](https://codesandbox.io/signin)**: `CSB_API_KEY=<your_csb_api_key>`
3. Run `npm install` and `npm run dev` to install dependencies and run locally

## Contributing

For contributing to the repo, please see the [contributing guide](./CONTRIBUTING.md)
