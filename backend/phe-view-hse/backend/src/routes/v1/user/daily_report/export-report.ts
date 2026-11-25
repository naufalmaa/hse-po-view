import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { withErrorHandler } from "../../../../utils/withErrorHandler.ts";
import { listAllDailyReports } from '../../../../services/daily-report/list.service.ts';
import { generateReportHTML } from '../../../../utils/reportHtmlGenerator.ts';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import env from '../../../../config/env.config.ts';
import type { ListDailyReportsParams } from '../../../../types/report.ts';

const ErrorResponse = Type.Object({
  success: Type.Optional(Type.Boolean()),
  message: Type.String(),
});

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

const ExportQuery = Type.Object({
  date_start: Type.Optional(Type.String()),
  date_end: Type.Optional(Type.String()),
  formTypes: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  subtypes: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  vesselId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  reportIds: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  showInspectionTables: Type.Optional(Type.Union([Type.Boolean(), Type.String()])),
});

function toArray(val: any): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val;
  return [val];
}

async function handleExport(req: any, reply: any, paramDate?: string) {
  const query = (req.query || {}) as any;
  const user = req.session.user;

  const finalDateStart = query.date_start || paramDate;
  const finalDateEnd = query.date_end || paramDate;
  const formTypes = toArray(query.formTypes);
  const subtypes = toArray(query.subtypes);
  const vesselId = toArray(query.vesselId);
  const reportIds = toArray(query.reportIds);
  const showInspectionTables = query.showInspectionTables === true || query.showInspectionTables === 'true';

  // Get reports matching filters
  const listData = await listAllDailyReports({
    date_start: finalDateStart,
    date_end: finalDateEnd,
    formTypes: formTypes || ['project', 'marine'],
    subtypes: subtypes || [],
    vesselId: vesselId || [],
    reportIds: reportIds || [],
    showDetails: true,
    groupByDate: false,
    view: 500, // Fetch all matching reports in range
  } as ListDailyReportsParams, user);

  const reports = listData.data;
  if (!reports || reports.length === 0) {
    return reply.status(404).send({ 
      success: false,
      message: req.i18n.t('user.dailyReport.report.dailyReportNotFound')
    });
  }

  let browser = null;
  try {
    // Prepare flattened reports for the generator
    const flattenedReports = reports.map((r: any) => ({
      ...r,
      ...(r.detail || {})
    }));

    // Generate HTML for each report and extract their body content
    const rawReportsHtml = await Promise.all(flattenedReports.map(async (report) => {
      let html = await generateReportHTML(report, { showInspectionTables });
      
      // Replace public uploads URL with internal one for Puppeteer
      const publicUploadsUrl = env.server.uploadsUrl;
      const internalUploadsUrl = `${env.server.baseUrl}/uploads`;
      if (publicUploadsUrl !== internalUploadsUrl) {
        html = html.split(publicUploadsUrl).join(internalUploadsUrl);
      }
      return html;
    }));

    // Extract head from the first generated HTML
    const headMatch = rawReportsHtml[0]?.match(/<head[^>]*>([\s\S]*)<\/head>/i);
    const head = headMatch ? headMatch[1] : '';

    const reportsHtmlParts = rawReportsHtml.map((html) => {
      // Extract content inside body
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      let content = bodyMatch ? bodyMatch[1] : html;
      
      // Remove the lucide script from individual parts to avoid multiple calls
      content = content.replace(/<script>\s*lucide\.createIcons\(\);\s*<\/script>/i, '');
      
      return `<div class="report-page">${content}</div>`;
    });

    const finalHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        ${head}
        <style>
          /* Continuous page - no page breaks */
          .report-page { 
            page-break-after: auto;
            page-break-inside: auto;
            margin-bottom: 30px;
            border-bottom: 3px solid #e2e8f0;
          }
          .report-page:last-child {
            margin-bottom: 0;
            border-bottom: none;
          }
          @media print {
            body { padding: 0; }
            .report-page { 
              page-break-after: auto;
              page-break-inside: auto;
            }
          }
        </style>
      </head>
      <body class="bg-slate-100 text-slate-800">
        ${reportsHtmlParts.join('')}
        <script>
          if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
          }
        </script>
      </body>
      </html>
    `;

    // Launch Puppeteer with @sparticuz/chromium for serverless/limited environments
    const isDev = process.env.NODE_ENV === 'development';
    const isWindows = process.platform === 'win32';

    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
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

    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    page.setDefaultTimeout(120000);
    await page.setViewport({ width: 1200, height: 1080 });
    
    // Use domcontentloaded instead of networkidle0 for faster loading
    // since we use base64 embedded images
    await page.setContent(finalHtml, { 
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });
    
    // Wait for Tailwind CDN to initialize
    try {
      await page.waitForFunction(() => typeof (window as any).tailwind !== 'undefined', { timeout: 8000 });
    } catch (e) {
      console.log('Tailwind CDN loading timeout, continuing...');
    }

    // Wait for fonts with shorter timeout
    try {
      await page.evaluateHandle('document.fonts.ready');
    } catch (e) {
      console.log('Fonts loading timeout, continuing...');
    }
    
    // Wait for images with shorter timeout
    try {
      await page.waitForFunction(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.every(img => img.complete);
      }, { timeout: 10000 });
    } catch (e) {
      console.log('Image loading timeout, continuing...');
    }
    
    // Small delay to ensure all icons, gradients, Tailwind layout, and fonts are fully painted
    await new Promise(resolve => setTimeout(resolve, 800));

    // Ensure Lucide icons are rendered
    await page.evaluate(() => {
      if (typeof (window as any).lucide !== 'undefined' && (window as any).lucide.createIcons) {
        (window as any).lucide.createIcons();
      }
    });

    // Get full page height
    const pageHeight = await page.evaluate(() => {
      return document.documentElement.scrollHeight;
    });
    
    const pdfBuffer = await page.pdf({
      width: '297mm', // A4 landscape width
      height: Math.max(pageHeight + 100, 1123), // Dynamic height or minimum A4 height
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      timeout: 120000
    });
    
    await browser.close();
    browser = null;

    const filename = `daily-reports-${finalDateStart || 'export'}${finalDateEnd && finalDateEnd !== finalDateStart ? `_to_${finalDateEnd}` : ''}.pdf`;

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(pdfBuffer);

  } catch (error) {
    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
      }
    }
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as Record<string, unknown>).message);
    } else if (error) {
      errorMessage = String(error);
    }
    return reply.status(500).send({
      success: false,
      message: 'Failed to generate PDF report : ' + errorMessage
    });
  }
}

const exportDailyReportRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: 'GET',
    url: '/export',
    schema: {
      tags: ['Daily Report'],
      summary: 'Export daily reports for date range/filters as PDF',
      querystring: ExportQuery,
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      return handleExport(req, reply);
    }),
  });

  app.route({
    method: 'GET',
    url: '/export/:date',
    schema: {
      tags: ['Daily Report'],
      summary: 'Export daily reports for a specific date as PDF',
      params: Type.Object({
        date: Type.String(),
      }),
      querystring: ExportQuery,
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
        500: ErrorResponse,
      },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { date } = req.params as { date: string };
      return handleExport(req, reply, date);
    }),
  });
};

export default exportDailyReportRoute;