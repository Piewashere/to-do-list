const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",
    testMatch: ["**/test_*.js"],
    outputDir: "test-results/artifacts",
    use: {
        baseURL: "http://localhost:4004",
        headless: true,
    }
})