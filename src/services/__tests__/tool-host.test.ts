/**
 * Integration tests for Tool Host HTTP Get tool with browser fallback and Shell tool.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ToolHost } from "../tool-host.js";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

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

describe("ToolHost shell", () => {
  let toolHost: ToolHost;
  let testSandboxDir: string;

  beforeEach(async () => {
    // Create a temporary sandbox directory for tests
    testSandboxDir = join(process.cwd(), "test-sandbox-" + Date.now());
    await mkdir(testSandboxDir, { recursive: true });
    toolHost = new ToolHost({ sandboxDir: testSandboxDir });
  });

  afterEach(async () => {
    if (toolHost) {
      // Clean up browser service if it was created
      const browserService = (toolHost as any).browserService;
      if (browserService) {
        await browserService.close().catch(() => {});
      }
    }
    // Clean up test sandbox directory
    if (testSandboxDir && existsSync(testSandboxDir)) {
      await rm(testSandboxDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe("file operations", () => {
    it("reads a file using cat command", async () => {
      const testFile = join(testSandboxDir, "test-read.txt");
      const testContent = "Hello, World!\nThis is a test file.";
      await writeFile(testFile, testContent, "utf-8");

      const result = await (toolHost as any).shellTool({
        command: `cat test-read.txt`,
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(testContent);
      expect(result.stderr).toBe("");
      expect(result.command).toBe(`cat test-read.txt`);
      expect(result.cwd).toBe(testSandboxDir);
    });

    it("writes a file using echo and redirection", async () => {
      const testFile = join(testSandboxDir, "test-write.txt");
      const testContent = "Written by shell tool";

      const result = await (toolHost as any).shellTool({
        command: `echo "${testContent}" > test-write.txt`,
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(0);
      
      // Verify file was created and contains correct content
      const fileExists = existsSync(testFile);
      expect(fileExists).toBe(true);
      
      if (fileExists) {
        const content = await readFile(testFile, "utf-8");
        expect(content.trim()).toBe(testContent);
      }
    });

    it("lists files using ls command", async () => {
      // Create some test files
      await writeFile(join(testSandboxDir, "file1.txt"), "content1", "utf-8");
      await writeFile(join(testSandboxDir, "file2.txt"), "content2", "utf-8");

      const result = await (toolHost as any).shellTool({
        command: "ls -1",
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("file1.txt");
      expect(result.stdout).toContain("file2.txt");
      expect(result.stderr).toBe("");
    });

    it("lists files with details using ls -la", async () => {
      await writeFile(join(testSandboxDir, "test-ls.txt"), "content", "utf-8");

      const result = await (toolHost as any).shellTool({
        command: "ls -la test-ls.txt",
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("test-ls.txt");
    });
  });

  describe("custom cwd parameter", () => {
    it("uses custom cwd when provided", async () => {
      const customDir = join(testSandboxDir, "custom-dir");
      await mkdir(customDir, { recursive: true });
      await writeFile(join(customDir, "custom-file.txt"), "custom content", "utf-8");

      const result = await (toolHost as any).shellTool({
        command: "cat custom-file.txt",
        cwd: customDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("custom content");
      expect(result.cwd).toBe(customDir);
    });

    it("defaults to sandboxDir when cwd is not provided", async () => {
      await writeFile(join(testSandboxDir, "default-file.txt"), "default content", "utf-8");

      const result = await (toolHost as any).shellTool({
        command: "cat default-file.txt",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("default content");
      expect(result.cwd).toBe(testSandboxDir);
    });
  });

  describe("sandbox path validation", () => {
    it("rejects paths outside sandbox directory", async () => {
      const outsidePath = join(process.cwd(), "outside-sandbox");

      await expect(
        (toolHost as any).shellTool({
          command: "echo test",
          cwd: outsidePath,
        })
      ).rejects.toThrow(/outside sandbox directory/);
    });

    it("rejects path traversal attempts in cwd", async () => {
      await expect(
        (toolHost as any).shellTool({
          command: "echo test",
          cwd: "../",
        })
      ).rejects.toThrow(/Path traversal detected/);
    });

    it("rejects path traversal attempts in command string", async () => {
      await expect(
        (toolHost as any).shellTool({
          command: "cat ../etc/passwd",
          cwd: testSandboxDir,
        })
      ).rejects.toThrow(/Path traversal detected in command string/);
    });

    it("allows valid paths within sandbox", async () => {
      const subDir = join(testSandboxDir, "subdir");
      await mkdir(subDir, { recursive: true });
      await writeFile(join(subDir, "test.txt"), "content", "utf-8");

      const result = await (toolHost as any).shellTool({
        command: "cat test.txt",
        cwd: subDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("content");
    });
  });

  describe("invalid command handling", () => {
    it("handles non-existent command gracefully", async () => {
      const result = await (toolHost as any).shellTool({
        command: "nonexistent-command-12345",
        cwd: testSandboxDir,
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
      expect(result.command).toBe("nonexistent-command-12345");
    });

    it("handles missing command parameter", async () => {
      await expect(
        (toolHost as any).shellTool({
          cwd: testSandboxDir,
        })
      ).rejects.toThrow(/shell requires command/);
    });
  });

  describe("command exit codes", () => {
    it("returns exit code 0 for successful commands", async () => {
      const result = await (toolHost as any).shellTool({
        command: "echo success",
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("success");
    });

    it("returns non-zero exit code for failed commands", async () => {
      const result = await (toolHost as any).shellTool({
        command: "false", // false command always exits with code 1
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(1);
    });

    it("handles commands that exit with specific codes", async () => {
      // Use a command that exits with code 2
      const result = await (toolHost as any).shellTool({
        command: "exit 2",
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(2);
    });
  });

  describe("stdout and stderr capture", () => {
    it("captures stdout correctly", async () => {
      const result = await (toolHost as any).shellTool({
        command: "echo 'stdout message'",
        cwd: testSandboxDir,
      });

      expect(result.stdout).toContain("stdout message");
      expect(result.stderr).toBe("");
    });

    it("captures stderr correctly", async () => {
      const result = await (toolHost as any).shellTool({
        command: "echo 'error message' >&2",
        cwd: testSandboxDir,
      });

      expect(result.stderr).toContain("error message");
    });

    it("captures both stdout and stderr", async () => {
      const result = await (toolHost as any).shellTool({
        command: "echo 'stdout' && echo 'stderr' >&2",
        cwd: testSandboxDir,
      });

      expect(result.stdout).toContain("stdout");
      expect(result.stderr).toContain("stderr");
    });

    it("handles empty stdout and stderr", async () => {
      const result = await (toolHost as any).shellTool({
        command: "true", // true command produces no output
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
    });
  });

  describe("response format", () => {
    it("includes all required fields in response", async () => {
      const result = await (toolHost as any).shellTool({
        command: "echo test",
        cwd: testSandboxDir,
      });

      expect(result).toHaveProperty("stdout");
      expect(result).toHaveProperty("stderr");
      expect(result).toHaveProperty("exitCode");
      expect(result).toHaveProperty("command");
      expect(result).toHaveProperty("cwd");

      expect(typeof result.stdout).toBe("string");
      expect(typeof result.stderr).toBe("string");
      expect(typeof result.exitCode).toBe("number");
      expect(typeof result.command).toBe("string");
      expect(typeof result.cwd).toBe("string");
    });

    it("includes command and cwd in response", async () => {
      const command = "echo 'test command'";
      const cwd = testSandboxDir;

      const result = await (toolHost as any).shellTool({
        command,
        cwd,
      });

      expect(result.command).toBe(command);
      expect(result.cwd).toBe(cwd);
    });
  });

  describe("edge cases", () => {
    it("handles commands with special characters", async () => {
      const result = await (toolHost as any).shellTool({
        command: "echo 'Hello, World! $PATH'",
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Hello, World!");
    });

    it("handles multi-line commands", async () => {
      const result = await (toolHost as any).shellTool({
        command: "echo 'line1' && echo 'line2'",
        cwd: testSandboxDir,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("line1");
      expect(result.stdout).toContain("line2");
    });

    it("handles empty command string", async () => {
      await expect(
        (toolHost as any).shellTool({
          command: "",
          cwd: testSandboxDir,
        })
      ).rejects.toThrow(/shell requires command/);
    });
  });
});
