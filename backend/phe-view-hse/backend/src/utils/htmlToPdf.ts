import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import env from '../config/env.config.ts';

export interface PdfOptions {
  format?: 'A4' | 'Letter' | 'A3' | 'B4' | 'B5' | 'B6';
  margin?: string | number | { top?: string | number; right?: string | number; bottom?: string | number; left?: string | number };
  orientation?: "portrait" | "landscape";
}

async function getLaunchOptions() {
  const isDev = process.env.NODE_ENV === 'development';
  const isWindows = process.platform === 'win32';

  // Use @sparticuz/chromium for serverless/limited environments (non-Windows production)
  const launchOptions: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  };

  // 1. Priority: Environment variable override
  if (env.server.chromePath) {
    launchOptions.executablePath = env.server.chromePath;
  } 
  // 2. Secondary: @sparticuz/chromium (useful for serverless like Lambda in production)
  else if (!isWindows && !isDev) {
    try {
      launchOptions.executablePath = await chromium.executablePath();
    } catch (error) {
      console.warn('Failed to get chromium executable path from @sparticuz/chromium, falling back to default puppeteer');
    }
  }

  // If no executablePath is set, puppeteer will use its own bundled chromium
  return launchOptions;
}

/**
 * Convert HTML content to PDF buffer
 * Uses Puppeteer for reliable PDF generation with Chromium
 */
export async function htmlToPdf(htmlContent: string, options: PdfOptions = {}): Promise<Buffer> {
  const browser = await puppeteer.launch(await getLaunchOptions());

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any, timeout: 60000 });

    // Prepare margin options
    const margin = formatMargin(options.margin);
    
    const pdfBuffer = await page.pdf({
      format: (options.format || 'A4') as any,
      landscape: options.orientation === 'landscape',
      printBackground: true,
      margin,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Convert HTML content to PDF file
 * Uses Puppeteer for reliable PDF generation with Chromium
 */
export async function htmlToPdfFile(
  htmlContent: string,
  filePath: string,
  options: PdfOptions = {}
): Promise<void> {
  const browser = await puppeteer.launch(await getLaunchOptions());

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any, timeout: 60000 });

    // Prepare margin options
    const margin = formatMargin(options.margin);

    await page.pdf({
      path: filePath,
      format: (options.format || 'A4') as any,
      landscape: options.orientation === 'landscape',
      printBackground: true,
      margin,
    });
  } finally {
    await browser.close();
  }
}

/**
 * Format margin option for Puppeteer PDF API
 */
function formatMargin(margin?: string | number | { top?: string | number; right?: string | number; bottom?: string | number; left?: string | number }) {
  if (!margin) {
    return { top: '20px', right: '20px', bottom: '20px', left: '20px' };
  }
  
  if (typeof margin === 'string' || typeof margin === 'number') {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  
  return {
    top: margin.top ?? '20px',
    right: margin.right ?? '20px',
    bottom: margin.bottom ?? '20px',
    left: margin.left ?? '20px',
  };
}
