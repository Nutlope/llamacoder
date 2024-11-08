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

const score = z.object({
  score: z.enum(["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"]),
});

const prompts = [
  "Build me a quiz app",
  "Build a calculator app",
  "Build a budgeting app",
  "Build a spotify clone",
  "Build a dashboard showing the US population over time",
];

async function gradeScreenshots({ prompt }: { prompt: string }) {
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  await page.goto("https://llamacoder.together.ai/");

  // Type into the main input
  await page.type("input", "Build a calculator app");

  await page.click("button[type=submit]");
  // await page.waitForSelector('button[type=submit]', { visible: true });
  await page.waitForFunction(
    (text) => {
      const elements = Array.from(document.querySelectorAll("p"));
      return !elements.some((element) => element.textContent?.includes(text));
    },
    {},
    "Buiding your app",
  );

  await page.evaluate(() => {
    debugger;
  });

  // Wait for 20 seconds
  await new Promise((resolve) => setTimeout(resolve, 20000));

  // Click the publish app button
  // await page.click("button#publish-app");

  // // // Wait for navigation to complete
  // // await page.waitForNavigation();

  // // // Get the URL from the clipboard
  // // const clipboardUrl = await page.evaluate(() =>
  // //   navigator.clipboard.readText()
  // // );

  // // // Navigate to the URL in the clipboard
  // // await page.goto(clipboardUrl);

  // // Take a screenshot & close
  // const screenshotBuffer = await page.screenshot();
  // await browser.close();

  // const base64String = Buffer.from(screenshotBuffer).toString("base64");
  // const imageUrl = `data:image/png;base64,${base64String}`;

  // API call to vision API to grade the function (or to braintrust directly)
  // const openai = new OpenAI();
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4o",
  //   messages: [
  //     {
  //       role: "system",
  //       content: `You are a world class designer. You will be given an image of a website and asked to judge its design on a scale of 1 to 5, with 5 being a striking and gorgeous professional-looking design, and a 1 being an amateur poorly designed website. Please think through your response carefully and respond with a number only at the end. Be harsh.

  //         Some things to consider:
  //         - Visual appeal and aesthetic consistency
  //         - Appropriate color schemes and typography
  //         - Effective use of layout and spacing
  //         - Uniform styling and behavior across the app
  //         - Consistent use of components and design patterns

  //         Please be tough critic. Only give a 5 to extremely beautiful websites.
  //         `,
  //     },
  //     {
  //       role: "user",
  //       content: [
  //         {
  //           type: "text",
  //           text: "Here's the image of the website:",
  //         },
  //         {
  //           type: "image_url",
  //           image_url: {
  //             url: imageUrl,
  //           },
  //         },
  //       ],
  //     },
  //   ],
  //   temperature: 0,
  //   response_format: zodResponseFormat(score, "score"),
  // });
  // console.log(response.choices[0]);
}

gradeScreenshots({ prompt: prompts[0] });
