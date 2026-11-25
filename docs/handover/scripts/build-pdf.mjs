// Membuat versi PDF dari dokumen serah terima (docs/handover/*.md dan database/*.md) ke docs/handover/pdf/.
//   cd backend/phe-view-hse/backend && npm ci      (sekali; memakai puppeteer milik backend)
//   node docs/handover/scripts/build-pdf.mjs       (dari root repo; butuh internet untuk marked + mermaid dari CDN)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(here, '..');
const repoRoot = path.resolve(docsDir, '../..');
const require = createRequire(path.join(repoRoot, 'backend/phe-view-hse/backend/package.json'));
const puppeteer = require('puppeteer');

const outDir = path.join(docsDir, 'pdf');
fs.mkdirSync(outDir, { recursive: true });

const files = [
  'README.md',
  ...fs.readdirSync(docsDir).filter((f) => /^\d\d-.*\.md$/.test(f)).sort(),
  'database/ERD.md',
  'database/KAMUS-DATA.md',
];

const css = `
  @page { size: A4; margin: 18mm 14mm 18mm 14mm; }
  body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1f2328; }
  h1 { font-size: 20pt; border-bottom: 2px solid #0b5394; padding-bottom: 6px; color: #0b5394; margin-top: 0; }
  body.erd h2 { page-break-before: always; }
  h2 { font-size: 14pt; color: #0b5394; margin-top: 22px; border-bottom: 1px solid #d0d7de; padding-bottom: 3px; }
  h3 { font-size: 12pt; margin-top: 16px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9pt; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #d0d7de; padding: 4px 6px; vertical-align: top; text-align: left; }
  th { background: #eef3f8; }
  code { font-family: Consolas, "Courier New", monospace; font-size: 8.8pt; background: #f3f5f7; padding: 0 3px; border-radius: 3px; }
  pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #0b5394; margin: 8px 0; padding: 2px 12px; color: #444; background: #f6f9fc; }
  a { color: #0b5394; text-decoration: none; }
  .mermaid { text-align: center; margin: 10px 0; page-break-inside: avoid; }
  .mermaid svg { max-width: 100%; height: auto; }
  input[type=checkbox] { margin-right: 6px; }
`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const rel of files) {
    const src = path.join(docsDir, rel);
    if (!fs.existsSync(src)) continue;
    const md = fs.readFileSync(src, 'utf8');
    const title = (md.match(/^#\s+(.+)$/m) || [, rel])[1];
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style>
      <script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script></head>
      <body class="${rel.includes('ERD') ? 'erd' : ''}"><main id="c"></main><script>
        const md = ${JSON.stringify(md)};
        const r = new marked.Renderer();
        const baseCode = r.code.bind(r);
        r.code = (code, lang) => lang === 'mermaid' ? '<div class="mermaid">' + code + '</div>' : baseCode(code, lang);
        // tautan antar dokumen .md -> .pdf
        const baseLink = r.link.bind(r);
        r.link = (href, t, text) => baseLink(href && !/^https?:/.test(href) ? href.replace(/(^|\\/)([^\\/#]+)\\.md(#|$)/, (m, a, b, c) => a + b + '.pdf' + c).replace(/^database\\//, '') : href, t, text);
        document.getElementById('c').innerHTML = marked.parse(md, { renderer: r, gfm: true });
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', er: { useMaxWidth: true }, flowchart: { useMaxWidth: true } });
        mermaid.run({ querySelector: '.mermaid' }).then(() => { window.__done = true; }).catch((e) => { console.error(e); window.__done = true; });
      </script></body></html>`;
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForFunction('window.__done === true', { timeout: 120000 });
    const out = path.join(outDir, path.basename(rel).replace(/\.md$/, '.pdf'));
    await page.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:7pt;width:100%;padding:0 14mm;color:#888;">HSE Proview, dokumen serah terima</div>`,
      footerTemplate: `<div style="font-size:7pt;width:100%;padding:0 14mm;color:#888;display:flex;justify-content:space-between;"><span>${path.basename(rel)}</span><span>Halaman <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
    });
    await page.close();
    console.log('PDF:', path.relative(repoRoot, out));
  }
} finally {
  await browser.close();
}
