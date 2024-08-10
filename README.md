<a href="https://www.llamacoder.io">
  <img alt="Llama Coder" src="./public/og-image.png">
  <h1 align="center">Llama Coder</h1>
</a>

<p align="center">
  An open source Claude Artifacts – generate small apps with one prompt. Powered by Llama 3 405B & Together.ai.
</p>

## Tech stack

- [Llama 3.1 405B](https://ai.meta.com/blog/meta-llama-3-1/) from Meta for the LLM
- [Together AI](https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup) for LLM inference
- [Sandpack](https://sandpack.codesandbox.io/) for the code sandbox
- Next.js app router with Tailwind
- Helicone for observability
- Plausible for website analytics

## Cloning & running

1. Clone the repo: `git clone https://github.com/Nutlope/llamacoder`
2. Create a `.env` file and add your [Together AI API key](https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup): `TOGETHER_API_KEY=`
3. Run `npm install` and `npm run dev` to install dependencies and run locally

## Future Tasks

- [ ] Experiment with a prompt rewriter and launch this as well
- [ ] Make the toast that opens better like a modal for sharability
- [ ] Add sharability to people can take their apps and share them publicly
- [ ] Add the ability to toggle on and off shadcn components and others
- [ ] Launch support for different themes – somehow pass down variables to components
- [ ] Add dynamic OG images to the specific generations & include the prompt
- [ ] Add more dynamic OG images for playwright
- [ ] Address issue of ability to publish the same app repeatedly
- [ ] Try chain of thought reasoning to see if it works better overall
- [ ] Encourage best practices by making the input and textarea & having pills to generate apps w/ good prompts
- [ ] Add more customizability in terms of changing the prompt, temperature, ect...
- [ ] Save previous versions so people can go back and forth between the generated ones
- [ ] Could be nice to show a "featured apps" route on the site on /featured. Have a /id/${prompt} dynamic route that can display a bunch of nice example apps in the sandbox ready to go
- [ ] Support more languages starting with Python, check out E2B
- [ ] Try chain of thought reasoning to see if it works better overall
- [ ] Try finetuning a smaller model on good prompts from 405b or GPT-4/Claude
- [ ] Add dark mode to the site overall, nice design change
- [ ] Surface errors better in codesandbox to the user so people know what is wrong
- [ ] Think about how to have 405B correct itself (sometimes it makes up imports)
- [ ] New route for updateCode that only sends the latest generated code + the modify request
- [ ] Fix bug where if a user edits the code, then does a change, it doesn't use the edited code
- [ ] Add rate limiting with redis upstash if the traffic gets too high
- [ ] Try to add a consistent component library like shadcn
- [ ] Apply code diffs directly instead of asking the model to generate the code from scratch
- [ ] Add the ability to upload things like a screenshot for it to start from that
