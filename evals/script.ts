/*
There are 3 evals we want to test for:

1. Design quality: Getting 10 prompts to work through the GPT-4v model that grades them design-wise.
2. Functionality: Assesement to see if the app returns valid react code (maybe also LLM as a judge)
3. Prompt following: LLM as a judge eval to see if it followed the prompt
*/

// 1. Design quality

import puppeteer from "puppeteer";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import "dotenv/config";

const score = z.object({
  score: z.enum(["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"]),
});

const prompts = [
  "Build a budgeting app",
  "Build a calculator app",
  "Build me a quiz app",
  "Build a spotify clone",
  "Build a dashboard showing the US population over time",
];

async function gradeScreenshots({ prompt }: { prompt: string }) {
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1000 });
  await page.goto("http://localhost:3000");

  // Generate the app
  console.log(`${prompt}: Generating`);
  await page.type("input", prompt);
  await page.click("[data-test=create]");
  await page.waitForSelector("[data-test=loader]", { hidden: true });

  // Publish + visit
  await page.click("[data-test=publish]");
  await page.waitForSelector("[data-sonner-toast]");
  const shareURL = await page.evaluate(() => {
    return document.querySelector("[data-test=share-url]")?.textContent;
  });
  if (!shareURL) return;
  await page.goto(shareURL);

  await page.waitForSelector("iframe");
  const iframeElement = await page.$("iframe");
  if (!iframeElement) return;
  const iframe = await iframeElement.contentFrame();
  await iframe.waitForSelector("#root div");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Take a screenshot & close
  console.log(`${prompt}: Screenshot`);
  const screenshotBuffer = await page.screenshot({
    path: `./evals/screenshots/${prompt} ${currentTimestamp()}.png`,
  });
  await browser.close();
  const base64String = Buffer.from(screenshotBuffer).toString("base64");
  const imageUrl = `data:image/png;base64,${base64String}`;

  // API call to vision API to grade the function (or to braintrust directly)
  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a world class designer. You will be given an image of a website and asked to judge its design on a scale of 1 to 5, with 5 being a striking and gorgeous professional-looking design, and a 1 being an amateur poorly designed website. Please think through your response carefully and respond with a number only at the end. Be harsh.

          Some things to consider:
          - Visual appeal and aesthetic consistency
          - Appropriate color schemes and typography
          - Effective use of layout and spacing
          - Uniform styling and behavior across the app
          - Consistent use of components and design patterns

          Please be tough critic. Only give a 5 to extremely beautiful websites.
          `,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Here's the image of the website:",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    temperature: 0,
    response_format: zodResponseFormat(score, "score"),
  });
  console.log(response.choices[0]);
}

async function main() {
  await Promise.all(
    prompts.map((prompt) => gradeScreenshots({ prompt: prompt })),
  );
}

main();

function currentTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHour = hours % 12 || 12; // Convert to 12-hour format

  return `${year}-${month}-${day} at ${formattedHour}.${minutes}.${seconds} ${ampm}`;
}
