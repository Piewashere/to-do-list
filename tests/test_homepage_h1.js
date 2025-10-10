const { test, expect } = require("@playwright/test");

test("page loads and has an H1, header, main, and nav", async ({ page }, testInfo) => {
    await page.goto("/");

    const h1 = page.locator("h1");
    const header = page.locator("header");
    const nav = page.locator("nav");
    const main = page.locator("main");
    await expect(h1).toBeVisible;
    await expect(header).toBeVisible;
    await expect(nav).toBeVisible;
    await expect(main).toBeVisible;


    //single screenshot
    await page.screenshot(
        {
        path: testInfo.outputPath("homepage_HHNM.png"),
        fullPage: true
        });

    
});