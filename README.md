<a href="https://www.llamacoder.io">
  <img alt="Llama Coder" src="./public/og-image.png">
  <h1 align="center">Llama Coder</h1>
</a>

<p align="center">
  An open source Claude Artifacts – generate small React apps with one prompt. Powered by Llama 3 405B & Together.ai.
</p>

## React Engine

This is the React engine for Llama Coder. It generates and renders React applications based on user prompts.

## Tech stack

- [Llama 3.1 405B](https://ai.meta.com/blog/meta-llama-3-1/) from Meta for the LLM
- [Together AI](https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup) for LLM inference
- [Sandpack](https://sandpack.codesandbox.io/) for the React code sandbox
- Next.js app router with Tailwind
- Helicone for observability
- Plausible for website analytics

## Cloning & running

1. Clone the repo: `git clone https://github.com/Nutlope/llamacoder`
2. Create a `.env` file and add your [Together AI API key](https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup): `TOGETHER_API_KEY=`
3. Run `npm install` and `npm run dev` to install dependencies and run locally

## Exporting app feature (work in progress)

Look into a way to export/deploy the React app in a single click. Steps:

1. Generate a UUID
2. Write the React code + ID to a database
3. Dynamic route that fetches code
4. Use sandpack for now (but hide the code view)
5. Dynamic OG image

## Future Tasks

- [ ] Save previous versions so people can go back and forth between the generated ones
- [ ] Could be nice to show a "featured apps" route on the site on `/featured`. Have a `/id/${prompt}` dynamic route that can display a bunch of nice example apps in the sandbox ready to go
- [ ] Support more languages starting with Python, check out E2B
- [ ] Try finetuning a smaller model on good prompts from 405b or GPT-4/Claude
- [ ] Add dark mode to the site overall, nice design change
- [ ] Think about how to have 405B correct itself (sometimes it makes up imports)
- [ ] New route for updateCode that only sends the latest generated code + the modify request
- [ ] Fix bug where if a user edits the code, then does a change, it doesn't use the edited code
- [ ] Add rate limiting with redis upstash if the traffic gets too high
- [ ] Try to add a consistent component library like shadcn
- [ ] Apply code diffs directly instead of asking the model to generate the code from scratch
- [ ] Add the ability to upload things like a screenshot for it to start from that
