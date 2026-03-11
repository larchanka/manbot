import * as os from "os";

/**
 * Browser configuration utilities for realistic browser behavior and bot detection bypass.
 * Provides user agents, viewport sizes, and stealth plugin configuration.
 */

/**
 * Realistic user agents for different browsers and operating systems.
 * Updated with recent browser versions (2024-2026) to avoid detection.
 */
export const USER_AGENTS = {
  windows: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  ],
  macos: [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  ],
  linux: [
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  ]
} as const;

export type OSGroup = keyof typeof USER_AGENTS;

/**
 * Common viewport sizes matching real-world screen resolutions.
 * Used to simulate realistic browser window sizes.
 */
export const VIEWPORTS = [
  { width: 1920, height: 1080 }, // Full HD
  { width: 1366, height: 768 },   // Common laptop
  { width: 1536, height: 864 },   // Common laptop
  { width: 1440, height: 900 },   // MacBook Pro
  { width: 1280, height: 720 },    // HD
  { width: 1600, height: 900 },    // HD+
  { width: 2560, height: 1440 },   // 2K/QHD
  { width: 1920, height: 1200 },   // WUXGA
] as const;

/**
 * Detects the user's operating system.
 */
export function getUserOS(): OSGroup | "unknown" {
  const platform = os.platform();
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  if (platform === "linux") return "linux";
  return "unknown";
}

/**
 * Returns a random user agent from the predefined list corresponding to the user's OS.
 * This helps avoid detection by rotating through different browser fingerprints.
 * If the OS is unknown, it defaults to Windows user agents.
 *
 * @returns A random user agent string
 */
export function getRandomUserAgent(): string {
  let osGroup = getUserOS();
  if (osGroup === "unknown") {
    osGroup = "windows";
  }
  
  const agents = USER_AGENTS[osGroup as OSGroup];
  const index = Math.floor(Math.random() * agents.length);
  return agents[index]!;
}

/**
 * Returns a random viewport size from the predefined list.
 * Simulates realistic browser window dimensions to avoid detection.
 *
 * @returns An object with width and height properties
 */
export function getRandomViewport(): { width: number; height: number } {
  const index = Math.floor(Math.random() * VIEWPORTS.length);
  const viewport = VIEWPORTS[index]!;
  return { ...viewport };
}

/**
 * Stealth plugin configuration for playwright-extra.
 * 
 * This configuration enables various evasion techniques to bypass bot detection:
 * - Removes automation flags (webdriver, navigator.webdriver)
 * - Masks Chrome runtime properties
 * - Hides headless Chrome indicators
 * - Removes iframe contentWindow access restrictions
 * - Patches permissions API
 * - Masks plugins and languages
 * - Evades Chrome's automation detection
 * 
 * Note: Some features may not work perfectly with Playwright (as opposed to Puppeteer),
 * but the plugin still provides significant evasion capabilities.
 */
export const STEALTH_CONFIG = {
  // Enable all stealth features
  enabled: true,

  // Additional configuration can be passed to the stealth plugin
  // The plugin will automatically apply various evasion techniques
} as const;
