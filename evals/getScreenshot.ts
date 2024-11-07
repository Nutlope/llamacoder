import puppeteer from "puppeteer";
import * as tslab from "tslab";

async function takeFullPageScreenshotAsUInt8Array(htmlContent: string) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(htmlContent);

  const screenshotBuffer = await page.screenshot();
  const uint8Array = new Uint8Array(screenshotBuffer);

  await browser.close();
  return uint8Array;
}

async function displayComponent(input: string) {
  const html = await generateComponent(input);
  const img = await takeFullPageScreenshotAsUInt8Array(html);
  tslab.display.png(img);
  console.log(html);
}

import puppeteer from "puppeteer";
// Or import puppeteer from 'puppeteer-core';

// Launch the browser and open a new blank page
const browser = await puppeteer.launch();
const page = await browser.newPage();

// Navigate the page to a URL.
await page.goto("https://developer.chrome.com/");

// Set screen size.
await page.setViewport({ width: 1080, height: 1024 });

// Type into search box.
await page.locator(".prompt").fill("Make me a calculator app");

// Wait and click on first result.
await page.locator(".create").click();

// Locate the full title with a unique string.
const textSelector = await page
  .locator("text/Customize and automate") // wait for input to not be disabled
  .waitHandle();

// click Share
// visit share link
// let base64Screen = await page.screenshot
// pass to Claude and get score
// save the score
const fullTitle = await textSelector?.evaluate((el) => el.textContent);

// Print the full title.
console.log('The title of this blog post is "%s".', fullTitle);

await browser.close();
