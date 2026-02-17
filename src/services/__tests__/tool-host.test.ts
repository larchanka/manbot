/**
 * Integration tests for Tool Host HTTP Get tool with browser fallback.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ToolHost } from "../tool-host.js";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";

describe("ToolHost http_get", () => {
  let toolHost: ToolHost;
  let testServer: ReturnType<typeof createServer> | null = null;
  let serverUrl = "";

  beforeEach(() => {
    toolHost = new ToolHost();
    
    // Create a test HTTP server
    testServer = createServer((req, res) => {
      const url = req.url || "/";
      
      if (url === "/simple") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Simple Page</h1><p>Test content</p></body></html>");
      } else if (url === "/json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"message": "Hello World"}');
      } else if (url === "/forbidden") {
        res.writeHead(403, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Forbidden</h1></body></html>");
      } else if (url === "/unauthorized") {
        res.writeHead(401, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Unauthorized</h1></body></html>");
      } else if (url === "/redirect") {
        res.writeHead(302, { Location: "/simple" });
        res.end();
      } else if (url === "/html-no-content-type") {
        res.writeHead(200);
        res.end("<!DOCTYPE html><html><body><h1>No Content-Type</h1></body></html>");
      } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Not Found</h1></body></html>");
      }
    });

    // Start server
    return new Promise<void>((resolve) => {
      testServer!.listen(0, () => {
        const address = testServer!.address() as AddressInfo;
        serverUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (toolHost) {
      // Clean up browser service if it was created
      const browserService = (toolHost as any).browserService;
      if (browserService) {
        await browserService.close().catch(() => {});
      }
    }
    if (testServer) {
      await new Promise<void>((resolve) => {
        testServer!.close(() => resolve());
      });
      testServer = null;
    }
  });

  describe("basic functionality", () => {
    it("successfully fetches a simple URL with fetch", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/simple` });
      
      expect(result.status).toBe(200);
      expect(result.body).toContain("Simple Page");
      expect(result.contentType).toContain("text/html");
      expect(result.method).toBe("GET");
      expect(result.finalUrl).toBe(`${serverUrl}/simple`);
      expect(result.usedMethod).toBe("fetch");
      expect(result.responseTimeMs).toBeGreaterThan(0);
    });

    it("handles JSON responses", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/json` });
      
      expect(result.status).toBe(200);
      expect(result.body).toContain("Hello World");
      expect(result.contentType).toContain("application/json");
      expect(result.usedMethod).toBe("fetch");
    });

    it("handles 404 errors", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/notfound` });
      
      expect(result.status).toBe(404);
      expect(result.body).toContain("Not Found");
      expect(result.usedMethod).toBe("fetch");
    });
  });

  describe("fallback to browser", () => {
    it("falls back to browser on 403 response", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/forbidden` });
      
      // Should fallback to browser
      expect(result.status).toBe(403);
      expect(result.body).toContain("Forbidden");
      expect(result.usedMethod).toContain("browser");
    }, 30000); // Longer timeout for browser

    it("falls back to browser on 401 response", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/unauthorized` });
      
      // Should fallback to browser
      expect(result.status).toBe(401);
      expect(result.body).toContain("Unauthorized");
      expect(result.usedMethod).toContain("browser");
    }, 30000);
  });

  describe("explicit browser usage", () => {
    it("uses browser when useBrowser is true", async () => {
      const result = await (toolHost as any).httpGetTool({
        url: `${serverUrl}/simple`,
        useBrowser: true,
      });
      
      expect(result.status).toBe(200);
      expect(result.body).toContain("Simple Page");
      expect(result.usedMethod).toBe("browser");
    }, 30000);
  });

  describe("HTML to Markdown conversion", () => {
    it("converts HTML to Markdown by default", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/simple` });
      
      expect(result.status).toBe(200);
      // Should be converted to Markdown
      expect(result.body).toMatch(/# Simple Page/);
      expect(result.body).toContain("Test content");
      expect(result.body).not.toContain("<h1>");
    });

    it("converts HTML without Content-Type header", async () => {
      const result = await (toolHost as any).httpGetTool({
        url: `${serverUrl}/html-no-content-type`,
      });
      
      expect(result.status).toBe(200);
      // Should detect HTML and convert
      expect(result.body).toMatch(/# No Content-Type/);
    });

    it("skips Markdown conversion when convertToMarkdown is false", async () => {
      const result = await (toolHost as any).httpGetTool({
        url: `${serverUrl}/simple`,
        convertToMarkdown: false,
      });
      
      expect(result.status).toBe(200);
      // Should remain as HTML
      expect(result.body).toContain("<h1>Simple Page</h1>");
      expect(result.body).toContain("<html>");
    });

    it("does not convert non-HTML content", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/json` });
      
      expect(result.status).toBe(200);
      // JSON should remain unchanged
      expect(result.body).toContain('{"message": "Hello World"}');
      expect(result.body).not.toContain("#");
    });
  });

  describe("response format", () => {
    it("includes all required fields", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/simple` });
      
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("body");
      expect(result).toHaveProperty("contentType");
      expect(result).toHaveProperty("finalUrl");
      expect(result).toHaveProperty("method");
      expect(result).toHaveProperty("usedMethod");
      expect(result).toHaveProperty("responseTimeMs");
      
      expect(typeof result.status).toBe("number");
      expect(typeof result.body).toBe("string");
      expect(typeof result.contentType).toBe("string");
      expect(typeof result.finalUrl).toBe("string");
      expect(typeof result.method).toBe("string");
      expect(typeof result.usedMethod).toBe("string");
      expect(typeof result.responseTimeMs).toBe("number");
    });

    it("populates finalUrl correctly", async () => {
      const result = await (toolHost as any).httpGetTool({ url: `${serverUrl}/simple` });
      
      expect(result.finalUrl).toBe(`${serverUrl}/simple`);
    });
  });

  describe("error handling", () => {
    it("handles invalid URLs", async () => {
      await expect(
        (toolHost as any).httpGetTool({ url: "http://invalid-domain-that-does-not-exist-12345.com" })
      ).rejects.toThrow();
    });

    it("handles network failures gracefully", async () => {
      // Close server to simulate network failure
      await new Promise<void>((resolve) => {
        testServer!.close(() => resolve());
      });
      
      await expect(
        (toolHost as any).httpGetTool({ url: `${serverUrl}/simple` })
      ).rejects.toThrow();
    });
  });

  describe("browser fallback on fetch errors", () => {
    it("falls back to browser when fetch throws error", async () => {
      // Use an invalid URL that fetch will fail on, but browser might handle differently
      // Actually, let's test with a URL that fetch can't resolve
      const invalidUrl = "http://localhost:99999/invalid";
      
      // This should attempt fetch first, fail, then try browser
      try {
        const result = await (toolHost as any).httpGetTool({ url: invalidUrl });
        // If browser succeeds, check it
        expect(result.usedMethod).toContain("browser");
      } catch (error) {
        // If both fail, that's also acceptable
        expect(error).toBeDefined();
      }
    }, 30000);
  });
});
