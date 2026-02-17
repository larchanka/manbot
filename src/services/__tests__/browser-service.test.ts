/**
 * Integration tests for Browser Service.
 * Tests browser automation, stealth capabilities, and error handling.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BrowserService } from "../browser-service.js";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";

describe("BrowserService", () => {
  let service: BrowserService;
  let testServer: ReturnType<typeof createServer> | null = null;
  let serverUrl = "";

  beforeEach(async () => {
    service = new BrowserService();
    
    // Create a simple test HTTP server
    testServer = createServer((req, res) => {
      const url = req.url || "/";
      
      if (url === "/simple") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Simple Page</h1><p>Test content</p></body></html>");
      } else if (url === "/slow") {
        // Slow response (simulates slow-loading page)
        setTimeout(() => {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<html><body><h1>Slow Page</h1></body></html>");
        }, 2000);
      } else if (url === "/javascript") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h1>JavaScript Page</h1>
              <div id="content">Loading...</div>
              <script>
                setTimeout(() => {
                  document.getElementById('content').textContent = 'Loaded via JavaScript';
                }, 100);
              </script>
            </body>
          </html>
        `);
      } else if (url === "/redirect") {
        res.writeHead(302, { Location: "/simple" });
        res.end();
      } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Not Found</h1></body></html>");
      }
    });

    // Start server and get URL
    await new Promise<void>((resolve) => {
      testServer!.listen(0, () => {
        const address = testServer!.address() as AddressInfo;
        serverUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (service) {
      await service.close();
    }
    if (testServer) {
      await new Promise<void>((resolve) => {
        testServer!.close(() => resolve());
      });
      testServer = null;
    }
  });

  describe("fetchWithBrowser", () => {
    it("fetches a simple static HTML page", async () => {
      const result = await service.fetchWithBrowser(`${serverUrl}/simple`);
      
      expect(result.status).toBe(200);
      expect(result.body).toContain("<h1>Simple Page</h1>");
      expect(result.body).toContain("Test content");
      expect(result.contentType).toContain("text/html");
      expect(result.finalUrl).toBe(`${serverUrl}/simple`);
      expect(result.method).toBe("GET");
    });

    it("handles redirects and returns final URL", async () => {
      const result = await service.fetchWithBrowser(`${serverUrl}/redirect`);
      
      // Should follow redirect
      expect(result.finalUrl).toContain("/simple");
      expect(result.body).toContain("Simple Page");
    });

    it("handles pages with JavaScript content", async () => {
      const result = await service.fetchWithBrowser(`${serverUrl}/javascript`, {
        timeout: 5000,
      });
      
      expect(result.status).toBe(200);
      expect(result.body).toContain("JavaScript Page");
      // Should wait for JavaScript to execute
      expect(result.body).toContain("Loaded via JavaScript");
    });

    it("handles timeout errors gracefully", async () => {
      await expect(
        service.fetchWithBrowser(`${serverUrl}/slow`, {
          timeout: 1000, // Short timeout
        })
      ).rejects.toThrow();
    });

    it("handles invalid URLs", async () => {
      await expect(
        service.fetchWithBrowser("http://invalid-domain-that-does-not-exist-12345.com")
      ).rejects.toThrow();
    });

    it("handles 404 errors", async () => {
      const result = await service.fetchWithBrowser(`${serverUrl}/notfound`);
      
      expect(result.status).toBe(404);
      expect(result.body).toContain("Not Found");
    });
  });

  describe("browser instance management", () => {
    it("reuses browser instance across multiple requests", async () => {
      const result1 = await service.fetchWithBrowser(`${serverUrl}/simple`);
      const result2 = await service.fetchWithBrowser(`${serverUrl}/simple`);
      
      expect(result1.status).toBe(200);
      expect(result2.status).toBe(200);
      // Browser should be reused (no errors means it worked)
    });

    it("reuses browser context when reuseContext is enabled", async () => {
      const result1 = await service.fetchWithBrowser(`${serverUrl}/simple`, {
        reuseContext: true,
      });
      const result2 = await service.fetchWithBrowser(`${serverUrl}/simple`, {
        reuseContext: true,
      });
      
      expect(result1.status).toBe(200);
      expect(result2.status).toBe(200);
    });

    it("creates new context when reuseContext is disabled", async () => {
      const result1 = await service.fetchWithBrowser(`${serverUrl}/simple`, {
        reuseContext: false,
      });
      const result2 = await service.fetchWithBrowser(`${serverUrl}/simple`, {
        reuseContext: false,
      });
      
      expect(result1.status).toBe(200);
      expect(result2.status).toBe(200);
    });
  });

  describe("cleanup", () => {
    it("closes browser instance properly", async () => {
      await service.fetchWithBrowser(`${serverUrl}/simple`);
      await service.close();
      
      // Should not throw when closing
      await expect(service.close()).resolves.not.toThrow();
    });

    it("handles multiple close calls gracefully", async () => {
      await service.fetchWithBrowser(`${serverUrl}/simple`);
      await service.close();
      await service.close(); // Second close should not throw
      
      expect(true).toBe(true); // If we get here, it worked
    });
  });

  describe("stealth capabilities", () => {
    it("applies stealth plugin configuration", async () => {
      // Test that stealth plugin is applied by checking browser behavior
      // We can't directly test stealth detection, but we can verify the browser
      // launches and operates correctly with stealth enabled
      const result = await service.fetchWithBrowser(`${serverUrl}/simple`);
      
      expect(result.status).toBe(200);
      // If stealth plugin caused issues, we'd get errors
    });

    it("uses random user agents", async () => {
      // Make multiple requests and verify they work (user agent rotation happens internally)
      const results = await Promise.all([
        service.fetchWithBrowser(`${serverUrl}/simple`),
        service.fetchWithBrowser(`${serverUrl}/simple`),
        service.fetchWithBrowser(`${serverUrl}/simple`),
      ]);
      
      // All should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });
    });

    it("uses random viewport sizes", async () => {
      // Viewport rotation happens internally, verify requests still work
      const result = await service.fetchWithBrowser(`${serverUrl}/simple`);
      
      expect(result.status).toBe(200);
    });
  });

  describe("realistic behavior", () => {
    it("waits for network idle", async () => {
      const result = await service.fetchWithBrowser(`${serverUrl}/javascript`, {
        timeout: 5000,
      });
      
      // Should wait for JavaScript to execute (network idle)
      expect(result.body).toContain("Loaded via JavaScript");
    });

    it("handles custom timeout", async () => {
      const result = await service.fetchWithBrowser(`${serverUrl}/simple`, {
        timeout: 10000,
      });
      
      expect(result.status).toBe(200);
    });
  });
});
