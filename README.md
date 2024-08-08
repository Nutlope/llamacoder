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

## Future Tasks

- [ ] Make it generate more consistent apps by only importing from a component library like shadcn
  - [x] Partially working
  - [x] Need to figure out a way to use the @
  - [x] Need to import all the CSS stuff (main CSS file + tailwind css file)
  - [x] Need to add in all the shadcn components
  - [x] Try it with a few components and see if it works well FIRST, then refine it
  - [x] Test properly and see how it goes
  - [ ] Check out that checkbox & radio funcitonality
- [ ] New route for updateCode that only sends the latest generated code + the modify request
- [ ] Surface errors better in codesandbox to the user so people know what is wrong
- [ ] Launch support for different themes – somehow pass down variables to components
- [ ] Could be nice to show a "featured apps" sections on the site like artifactbin.com
- [ ] Add dark mode to the site overall to make it have a nice feel
- [ ] Save previous versions so people can go back and forth between the generated ones
- [ ] Potentially do some rate limiting if it continues to be expensive
- [ ] Support different kinds of apps/languages & scripts with Python, maybe w/ E2B
- [ ] Fix bug where if a user edits the code, then does a change, it doesn't use the edited code
- [ ] Apply code diffs directly instead of asking the model to generate the code from scratch
- [ ] Add the ability to upload things like a screenshot to it for it to start from that
- [ ] Try multiple shot prompting in weaker models or finetuning a smaller model
