## Tech stack

- [Llama 3.1 405B](https://ai.meta.com/blog/meta-llama-3-1/) from Meta for the LLM
- [Together AI](https://dub.sh/together-ai/?utm_source=example-app\&utm_medium=llamacoder\&utm_campaign=llamacoder-app-signup) for LLM inference
- [Sandpack](https://sandpack.codesandbox.io/) for the code sandbox
- Next.js app router with Tailwind
- Helicone for observability
- Plausible for website analytics

## Cloning & running

1. Clone the repo: `git clone https://github.com/Nutlope/llamacoder`

2. Create a `.env` file and add your API keys:

   - **[Together AI API key](https://dub.sh/together-ai/?utm_source=example-app\&utm_medium=llamacoder\&utm_campaign=llamacoder-app-signup)**: `TOGETHER_API_KEY=<your_together_ai_api_key>`
   - **[CSB API key](https://codesandbox.io/signin)**: `CSB_API_KEY=<your_csb_api_key>`
   - **Database URL**: Use [Neon](https://neon.tech) to set up your PostgreSQL database and add the Prisma connection string: `DATABASE_URL=<your_database_url>`

3. Run `npm install` to install dependencies.

4. Run `npm run dev` to start the development server locally.

## Contributing

For contributing to the repo, please see the [contributing guide](./CONTRIBUTING.md).

