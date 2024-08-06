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
2. Create a `.env` file and add your [Together AI API key](https://dub.sh/together-ai): `TOGETHER_API_KEY=`
3. Run `npm install` and `npm run dev` to install dependencies and run locally

## Actively working on

- [ ] Make it generate more consistent apps by only importing from a component library like shadcn
  - [x] Partially working
  - [x] Need to figure out a way to use the @
  - [x] Need to import all the CSS stuff (main CSS file + tailwind css file)
  - [x] Need to add in all the shadcn components
  - [ ] Try it with a few components and see if it works well FIRST, then refine it
  - [ ] Test properly and see how it goes
- [ ] Look into a way to export the app or deploy it in a single click – try two things:
  - [ ] The codesandbox way where I put the link in another way like the react docs, then I can infer the link and have people go check it out
  - [ ] The non-codesandbox way where i try to do it myself with a dynamic route by doing some hashing

## Future Tasks

- [ ] New route for updateCode that only sends the latest generated code + the modify request
- [ ] A/B test a way to feed in shadcn docs so its fully up to date on available components
- [ ] Could be nice to show a "featured apps" sections on the site like artifactbin.com
- [ ] Add dark mode
- [ ] Add a bring your own key version in case traffic gets too high
- [ ] Save previous versions so people can go back and forth between the generated ones
- [ ] Support different kinds of apps/languages & scripts with Python, maybe w/ E2B
- [ ] Fix bug where if a user edits the code, then does a change, it doesn't use the edited code
- [ ] Apply code diffs directly instead of asking the model to generate the code from scratch
- [ ] Add the ability to upload things like a screenshot to it for it to start from that
- [ ] Try multiple shot prompting in weaker models or finetuning a smaller model
