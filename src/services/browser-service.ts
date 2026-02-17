/**
 * Browser Service: Manages Playwright browser instances with stealth capabilities.
 * Provides browser-based web scraping with bot detection bypass.
 * P12-08: _board/TASKS/P12-08_BROWSER_SERVICE_CORE.md
 */

import { randomUUID } from "node:crypto";
import { chromium } from "playwright-extra";
import StealthPlugin = require("puppeteer-extra-plugin-stealth");
import type { Browser, BrowserContext, Page } from "playwright";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { getConfig } from "../shared/config.js";
import { getRandomUserAgent, getRandomViewport } from "./browser-config.js";

const PROCESS_NAME = "browser-service";

// Apply stealth plugin
chromium.use(StealthPlugin());

interface BrowserFetchOptions {
  /** Force browser usage even if not needed */
  useBrowser?: boolean;
  /** Convert HTML to Markdown */
  convertToMarkdown?: boolean;
  /** Timeout in milliseconds (overrides config) */
  timeout?: number;
  /** Reuse browser context */
  reuseContext?: boolean;
}

interface BrowserFetchResult {
  status: number;
  body: string;
  contentType: string;
  finalUrl: string;
  method: string;
}

interface BrowserFetchPayload {
  url: string;
  options?: BrowserFetchOptions;
}

export class BrowserService extends BaseProcess {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private readonly config = getConfig().browserService;
  private isClosing = false;

  constructor() {
    super({ processName: PROCESS_NAME });
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    this.onMessage((envelope) => {
      if (envelope.to !== PROCESS_NAME) return;

      if (envelope.type === "browser.fetch") {
        this.handleFetch(envelope);
      } else if (envelope.type === "browser.close") {
        this.handleCloseRequest(envelope);
      }
    });
  }

  private async handleFetch(envelope: Envelope): Promise<void> {
    const payload = envelope.payload as BrowserFetchPayload;
    const { url, options = {} } = payload;

    try {
      const result = await this.fetchWithBrowser(url, options);
      this.sendResponse(envelope, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.sendError(envelope, "BROWSER_ERROR", message);
    }
  }

  private async handleCloseRequest(envelope: Envelope): Promise<void> {
    try {
      await this.close();
      this.sendResponse(envelope, { success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.sendError(envelope, "CLOSE_ERROR", message);
    }
  }

  /**
   * Fetches a URL using Playwright browser with stealth capabilities.
   * 
   * @param url - The URL to fetch
   * @param options - Optional fetch configuration
   * @returns Promise resolving to fetch result with status, body, contentType, finalUrl, and method
   */
  async fetchWithBrowser(
    url: string,
    options: BrowserFetchOptions = {}
  ): Promise<BrowserFetchResult> {
    // Ensure browser is initialized
    await this.ensureBrowser();

    const timeout = options.timeout ?? this.config.timeout;
    const reuseContext = options.reuseContext ?? this.config.reuseContext;

    // Get or create context
    let context: BrowserContext;
    if (reuseContext && this.context) {
      context = this.context;
    } else {
      const viewport = getRandomViewport();
      const userAgent = getRandomUserAgent();

      context = await this.browser!.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        userAgent: userAgent,
        // Additional stealth settings
        locale: "en-US",
        timezoneId: "America/New_York",
        // Disable automation indicators
        ignoreHTTPSErrors: true,
        // Realistic browser headers
        extraHTTPHeaders: {
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "max-age=0",
        },
      });

      // Only store context if reuseContext is enabled
      if (reuseContext) {
        this.context = context;
      }
    }

    // Create page and navigate
    const page = await context.newPage();
    
    try {
      // Set up timeout
      page.setDefaultTimeout(timeout);

      // Disable automation flags via page context
      await page.addInitScript(() => {
        // Remove webdriver flag
        Object.defineProperty(navigator, "webdriver", {
          get: () => false,
        });
        
        // Override plugins
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // Override languages
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-US", "en"],
        });
      });

      // Random delay before navigation (100-500ms)
      const preNavDelay = Math.floor(Math.random() * 400) + 100;
      await page.waitForTimeout(preNavDelay);

      // Navigate to URL and wait for network idle
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: timeout,
      });

      // Wait for network idle (already done, but ensure content is loaded)
      await page.waitForLoadState("networkidle");

      // Add realistic mouse movement to random coordinates
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        const randomX = Math.floor(Math.random() * viewportSize.width);
        const randomY = Math.floor(Math.random() * viewportSize.height);
        await page.mouse.move(randomX, randomY, { steps: Math.floor(Math.random() * 10) + 5 });
      }

      // Random scroll behavior for long pages
      const contentHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = viewportSize?.height ?? 1080;
      
      if (contentHeight > viewportHeight) {
        // Scroll to random position (0 to max scroll)
        const maxScroll = contentHeight - viewportHeight;
        const scrollPosition = Math.floor(Math.random() * maxScroll);
        await page.evaluate((pos) => {
          window.scrollTo({ top: pos, behavior: "smooth" });
        }, scrollPosition);
        
        // Wait for scroll animation
        await page.waitForTimeout(Math.floor(Math.random() * 300) + 200);
      }

      // Random delay before content extraction (100-300ms)
      const preExtractDelay = Math.floor(Math.random() * 200) + 100;
      await page.waitForTimeout(preExtractDelay);

      // Get final URL (after redirects)
      const finalUrl = page.url();

      // Get status code
      const status = response?.status() ?? 0;

      // Get content type
      const contentType = response?.headers()["content-type"] ?? "text/html";

      // Extract HTML content
      const html = await page.content();

      // Clean up page
      await page.close();

      // Release context if not reusing
      if (!reuseContext) {
        await context.close();
      }

      return {
        status,
        body: html,
        contentType,
        finalUrl,
        method: "GET",
      };
    } catch (error) {
      // Clean up page on error
      await page.close().catch(() => {});
      
      // Release context if not reusing
      if (!reuseContext) {
        await context.close().catch(() => {});
      }

      throw error;
    }
  }

  /**
   * Ensures browser instance is initialized.
   * Uses singleton pattern - only one browser instance per service.
   */
  private async ensureBrowser(): Promise<void> {
    if (this.browser && this.browser.isConnected()) {
      return;
    }

    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          // Disable automation flags
          "--disable-automation",
          "--disable-infobars",
          "--disable-notifications",
          "--disable-popup-blocking",
          // Realistic browser behavior
          "--lang=en-US",
          "--disable-extensions",
        ],
      });

      // Handle browser disconnection
      this.browser.on("disconnected", () => {
        this.browser = null;
        this.context = null;
      });
    } catch (error) {
      this.browser = null;
      this.context = null;
      throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Closes browser instance and cleans up resources.
   */
  async close(): Promise<void> {
    if (this.isClosing) return;
    this.isClosing = true;

    try {
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
    } finally {
      this.isClosing = false;
    }
  }

  private sendResponse(request: Envelope, result: unknown): void {
    const payload = responsePayloadSchema.parse({ status: "success", result });
    this.send({
      id: randomUUID(),
      from: PROCESS_NAME,
      to: request.from,
      type: "response",
      version: PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload,
    });
  }

  private sendError(request: Envelope, code: string, message: string): void {
    this.send({
      id: randomUUID(),
      from: PROCESS_NAME,
      to: request.from,
      type: "error",
      version: PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: { code, message },
    });
  }
}

function main(): void {
  const service = new BrowserService();
  service.start();
  
  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await service.close();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    await service.close();
    process.exit(0);
  });
}

main();
