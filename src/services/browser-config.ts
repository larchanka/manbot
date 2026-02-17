/**
 * Browser configuration utilities for realistic browser behavior and bot detection bypass.
 * Provides user agents, viewport sizes, and stealth plugin configuration.
 */

/**
 * Realistic user agents for different browsers and operating systems.
 * Updated with recent browser versions (2024-2026) to avoid detection.
 */
export const USER_AGENTS = [
  // Chrome on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  
  // Chrome on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  
  // Chrome on Linux
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  
  // Firefox on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  
  // Firefox on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
  
  // Safari on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  
  // Edge on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
] as const;

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
 * Returns a random user agent from the predefined list.
 * This helps avoid detection by rotating through different browser fingerprints.
 *
 * @returns A random user agent string
 */
export function getRandomUserAgent(): string {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index];
}

/**
 * Returns a random viewport size from the predefined list.
 * Simulates realistic browser window dimensions to avoid detection.
 *
 * @returns An object with width and height properties
 */
export function getRandomViewport(): { width: number; height: number } {
  const index = Math.floor(Math.random() * VIEWPORTS.length);
  return { ...VIEWPORTS[index] };
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
