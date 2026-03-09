import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium } from "playwright";
import { z } from "zod";

const server = new McpServer({
  name: "playwright-server",
  version: "1.0.0",
});

server.tool(
  "open_page",
  "Opens a URL in a browser",
  { url: z.string().describe("The URL to open") },
  async ({ url }) => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url);
    return { status: "opened", url };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);
