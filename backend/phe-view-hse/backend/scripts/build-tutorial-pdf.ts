/**
 * Builds the per-role PDF guides (Bahasa Indonesia) from the in-app tutorial data and the Cypress screenshots.
 *   1. screenshots: cd frontend/phe-view-hse && E2E_CAPTURE=1 npx cypress run --e2e --config trashAssetsBeforeRuns=false --spec cypress/e2e/tutorial/capture.cy.ts
 *   2. PDFs:        cd backend/phe-view-hse/backend && npx tsx scripts/build-tutorial-pdf.ts [role ...]
 * Output: frontend/phe-view-hse/public/tutorials/panduan-safeview-<role>.pdf (downloaded from the tutorial menu).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import { TUTORIALS, ROLE_LABEL, type TutorialRole } from "../../../../frontend/phe-view-hse/src/constants/tutorials.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const FE = path.resolve(here, "../../../../frontend/phe-view-hse");
const SHOTS = path.join(FE, "cypress/reports/screenshots/capture.cy.ts");
const OUT = path.join(FE, "public/tutorials");
const LOGO = path.join(FE, "public/brand/safeview/logo-light.svg");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// screenshots are embedded as JPEG (converted once in main): PDFs about 4x smaller than with PNG
const shot = (role: string, name: string) => {
  const f = path.join(SHOTS, role, `${name}.jpg`);
  return fs.existsSync(f) ? pathToFileURL(f).href : null;
};

async function toJpeg(browser: import("puppeteer").Browser) {
  const page = await browser.newPage();
  for (const role of fs.existsSync(SHOTS) ? fs.readdirSync(SHOTS) : []) {
    const dir = path.join(SHOTS, role);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".png"))) {
      const png = path.join(dir, f);
      const jpg = png.replace(/\.png$/, ".jpg");
      if (fs.existsSync(jpg) && fs.statSync(jpg).mtimeMs >= fs.statSync(png).mtimeMs) continue;
      const buf = fs.readFileSync(png);
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      await page.setViewport({ width, height });
      await page.setContent(`<body style="margin:0"><img src="data:image/png;base64,${buf.toString("base64")}"></body>`, { waitUntil: "load" });
      await page.screenshot({ path: jpg as `${string}.jpeg`, type: "jpeg", quality: 72 });
    }
  }
  await page.close();
}

const ROLE_INTRO: Record<TutorialRole, string> = {
  admin: "Admin mengelola seluruh modul, pengguna, dan AI CSMS. Admin juga menjalankan evaluasi AI dan mengoreksi hasilnya.",
  user: "User HSE (PHE) memantau kinerja HSE, mengelola kontrak CSMS, dan menilai dokumen kontraktor.",
  contractor: "Kontraktor mengisi laporan harian, mengelola data pekerja, dan mengunggah dokumen CSMS untuk dinilai.",
  evaluator: "Evaluator adalah persetujuan tahap pertama untuk penilaian CSMS yang sudah final.",
  verifikator: "Verifikator adalah persetujuan tahap kedua, setelah Evaluator.",
  manager: "Manager memberi persetujuan terakhir pada penilaian CSMS.",
  crew: "Crew mengisi laporan harian dan melihat data pekerja.",
};

const STATUS_TABLE = `
<table class="ref"><tr><th>Status</th><th>Arti</th></tr>
<tr><td>Accept</td><td>Dokumen memenuhi kriteria (umumnya skor 6 atau 10).</td></tr>
<tr><td>Revisi</td><td>Ada bukti inti yang masih kurang (umumnya skor 3). Baca catatan, unggah perbaikan.</td></tr>
<tr><td>Reject</td><td>Dokumen tidak memenuhi atau tidak ada (skor 0).</td></tr>
<tr><td>N/A</td><td>Elemen tidak berlaku untuk kontrak ini.</td></tr></table>`;

function html(role: TutorialRole) {
  const list = TUTORIALS.filter((t) => t.roles.includes(role));
  const logo = fs.existsSync(LOGO) ? `<img class="logo" src="${pathToFileURL(LOGO).href}">` : "";
  const toc = list.map((t, i) => `<li><span>${i + 1}. ${esc(t.title)}</span></li>`).join("");
  const sections = list.map((t, i) => {
    const overview = shot(role, `${t.id}-0`);
    const steps = t.steps.map((s, j) => {
      const img = s.element ? shot(role, `${t.id}-${j + 1}`) : null;
      return `<div class="step"><div class="num">${j + 1}</div><div class="body"><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p>
        ${img ? `<img class="shot small" src="${img}">` : ""}</div></div>`;
    }).join("");
    const tips = t.tips?.length ? `<div class="tips"><b>Tips</b><ul>${t.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
    const where = t.requiresHint ? `<p class="where">Cara membuka: ${esc(t.requiresHint)}</p>` : t.route ? `<p class="where">Halaman: <code>${esc(t.route)}</code></p>` : "";
    const statuses = /penilaian|unggah/.test(t.id) ? STATUS_TABLE : "";
    return `<section><h2>${i + 1}. ${esc(t.title)}</h2><p class="purpose">${esc(t.purpose)}</p>${where}
      ${overview ? `<img class="shot" src="${overview}">` : ""}<h3>Langkah</h3>${steps}${statuses}${tips}</section>`;
  }).join("");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 16mm 14mm 18mm; }
    body { font: 10.5pt/1.5 "Segoe UI", Arial, sans-serif; color: #1f2433; }
    .cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
    .logo { height: 48px; margin-bottom: 28px; }
    .cover h1 { font-size: 28pt; margin: 0; } .cover .role { font-size: 16pt; color: #6d28d9; margin: 6px 0 18px; }
    .cover p { max-width: 140mm; color: #4b5563; }
    .toc { page-break-after: always; } .toc ol { list-style: none; padding: 0; } .toc li { padding: 4px 0; border-bottom: 1px dotted #d1d5db; }
    section { page-break-before: always; } h2 { font-size: 16pt; color: #4c1d95; margin: 0 0 4px; }
    h3 { font-size: 11pt; margin: 14px 0 6px; } h4 { margin: 0 0 2px; font-size: 10.5pt; }
    .purpose { color: #374151; margin: 0 0 4px; } .where { color: #6b7280; font-size: 9pt; margin: 0 0 8px; }
    .shot { width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; margin: 6px 0; }
    .shot.small { width: 78%; }
    .step { display: flex; gap: 10px; margin: 8px 0; page-break-inside: avoid; }
    .num { flex: 0 0 22px; height: 22px; border-radius: 50%; background: #ede9fe; color: #6d28d9; font-weight: 700; text-align: center; line-height: 22px; font-size: 9pt; }
    .body { flex: 1; } .body p { margin: 0; }
    .tips { background: #f5f3ff; border-radius: 8px; padding: 8px 12px; margin-top: 10px; page-break-inside: avoid; } .tips ul { margin: 4px 0 0 16px; padding: 0; }
    table.ref { border-collapse: collapse; margin-top: 10px; font-size: 9.5pt; } table.ref td, table.ref th { border: 1px solid #e5e7eb; padding: 4px 8px; text-align: left; }
    code { font-size: 9pt; background: #f3f4f6; padding: 0 4px; border-radius: 4px; }
  </style></head><body>
    <div class="cover">${logo}<h1>Panduan SafeView</h1><div class="role">Role: ${ROLE_LABEL[role]}</div>
      <p>${esc(ROLE_INTRO[role])}</p>
      <p>Panduan ini sama dengan tutorial di aplikasi (ikon topi wisuda di kanan atas, di sebelah lonceng). Tutorial bisa diputar ulang kapan saja.</p>
      <p style="color:#9ca3af;font-size:9pt">Versi ${new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}. Tangkapan layar memakai data demo yang dianonimkan.</p></div>
    <div class="toc"><h2>Daftar isi</h2><ol>${toc}</ol></div>
    ${sections}
  </body></html>`;
}

async function main() {
  const roles = (process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ROLE_LABEL)) as TutorialRole[];
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(SHOTS, "..", "tutorial-html");
  fs.mkdirSync(tmp, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ["--allow-file-access-from-files"] });
  try {
    await toJpeg(browser);
    for (const role of roles) {
      const file = path.join(tmp, `${role}.html`);
      fs.writeFileSync(file, html(role), "utf8");
      const page = await browser.newPage();
      await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
      const out = path.join(OUT, `panduan-safeview-${role}.pdf`);
      await page.pdf({
        path: out, format: "A4", printBackground: true, displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#9ca3af">Panduan SafeView · ${ROLE_LABEL[role]} · <span class="pageNumber"></span>/<span class="totalPages"></span></div>`,
        margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
      });
      await page.close();
      console.log(`${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
