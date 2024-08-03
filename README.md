<a href="https://www.llamacoder.io">
  <img alt="Llama Coder" src="./public/og-image.png">
  <h1 align="center">Llama Coder</h1>
</a>

<p align="center">
  An open source Claude Artifacts – generate small apps with one prompt. Powered by Llama 3 405B & Together.ai.
</p>

## Tech stack

- [Llama 3.1 405B](https://ai.meta.com/blog/meta-llama-3-1/) from Meta for the LLM
- [Together AI](https://dub.sh/together-ai) for LLM inference
- [Sandpack](https://sandpack.codesandbox.io/) for the code sandbox
- Next.js app router with Tailwind
- Helicone for observability
- Plausible for website analytics

## Cloning & running

1. Clone the repo: `git clone https://github.com/Nutlope/llamacoder`
2. Create a `.env` file and add your [Together AI API key]([Together AI](https://dub.sh/together-ai)): `TOGETHER_API_KEY=`
3. Run `npm install` and `npm run dev` to install dependencies and run locally

## Future Tasks

- [ ] New route for updateCode that only sends the latest generated code + the modify request
- [ ] Make it generate more consistent apps by only importing from a component library like shadcn
- [ ] Try to resolve the npm libraries issue, look into how Claude Artifacts and others deal with it
- [ ] Fix bug where if a user edits the code, then does a change, it doesn't use the edited code
- [ ] Save previous versions so people can go back and forth between the generated ones
- [ ] Apply code diffs directly instead of asking the model to generate the code from scratch'
- [ ] Add the ability to upload things like a screenshot to it for it to start from that
- [ ] Support different kinds of apps (not just React) & scripts with Python for example
