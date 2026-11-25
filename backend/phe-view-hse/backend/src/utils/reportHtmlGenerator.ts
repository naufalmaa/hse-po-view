import { db } from '../db/index.ts';
import { vessels } from '../db/schema/auth.schema.ts';
import { dailyReports, manhours as manhoursSchema } from '../db/schema/report.schema.ts';
import { eq, sql, sum } from 'drizzle-orm';
import env, { resolveExistingUploadFile } from '../config/env.config.ts';
import path from 'path';
import fs from 'fs';
import convert from 'heic-convert';

/**
 * Helper function to get image as base64 data URL from local file system
 * @param reportId The report ID
 * @param filePath The file path stored in database
 * @param fileName The original file name (optional fallback)
 * @param useThumbnail Whether to try the thumbnail first
 * @returns Base64 data URL or placeholder if file not found
 */
async function getImageBase64(reportId: string, filePath?: string, fileName?: string, useThumbnail: boolean = true): Promise<string | null> {
  try {
    let targetPath: string | null = null;

    // 1. Try thumbnail first if available
    if (useThumbnail) {
      if (filePath) {
        targetPath = resolveExistingUploadFile('reports', reportId, 'thumbnail', filePath);
      }
      if (!targetPath && fileName) {
        targetPath = resolveExistingUploadFile('reports', reportId, 'thumbnail', fileName);
      }
    }

    // 2. Fallback to full image
    if (!targetPath && filePath) {
      targetPath = resolveExistingUploadFile('reports', reportId, filePath);
    }
    if (!targetPath && fileName) {
      targetPath = resolveExistingUploadFile('reports', reportId, fileName);
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return null;
    }

    const ext = path.extname(targetPath).toLowerCase();

    // If HEIC, convert to JPEG on the fly
    if (ext === '.heic' || ext === '.heif') {
      try {
        const converted = await convert({
          buffer: fs.readFileSync(targetPath),
          format: 'JPEG',
          quality: 0.8
        });
        return `data:image/jpeg;base64,${Buffer.from(converted).toString('base64')}`;
      } catch (err) {
        console.error('Error converting HEIC image for PDF export:', err);
      }
    }

    const mimeType = ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.gif' ? 'image/gif' :
          ext === '.webp' ? 'image/webp' :
            ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
    const buffer = fs.readFileSync(targetPath);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Error reading image file:', error);
    return null;
  }
}

/**
 * Generates HTML content for a daily report using modern dashboard template
 * @param report The report data to generate HTML for
 * @returns HTML string for the report
 */
export async function generateReportHTML(report: any, options: { showInspectionTables?: boolean } = {}): Promise<string> {
  const isMarine = report.formType === 'marine';
  
  // Fetch vessel counts if marine
  let vesselStatusData: any[] = [];
  let totalVessels = 0;
  let safeManhours = 0;
  if (isMarine) {
    try {
      const counts = await db
        .select({
          type: vessels.type,
          count: sql<number>`count(*)`
        })
        .from(vessels)
        .where(eq(vessels.status, true))
        .groupBy(vessels.type);

      vesselStatusData = counts;
      totalVessels = counts.reduce((acc, curr) => acc + Number(curr.count), 0);

      const smResult = await db
        .select({
          total: sum(sql`COALESCE(${manhoursSchema.hoursPobPheOses}, 0) + COALESCE(${manhoursSchema.hoursPobContractor}, 0)`)
        })
        .from(manhoursSchema)
        .innerJoin(dailyReports, eq(manhoursSchema.reportId, dailyReports.id))
        .where(eq(dailyReports.formType, 'marine'));

      safeManhours = Number(smResult[0]?.total || 0);
    } catch (error) {
      console.error('Error fetching marine data:', error);
    }
  }

  // Format date - DD/MM/YYYY format
  const reportDate = new Date(report.reportDate);
  const formattedDate = `${String(reportDate.getDate()).padStart(2, '0')}/${String(reportDate.getMonth() + 1).padStart(2, '0')}/${reportDate.getFullYear()}`;

  // Get project name
  const projectName = isMarine ? 'MARINE HSE DAILY REPORT' : (report.subtypeName || 'N/A');
  const projectInstance = report.instansi || 'PHE OSES';

  // Get reporter name
  const reporterName = report.reportedBy || 'N/A';

  // Get lagging indicators
  const lagging = report.lagging || {};

  // Get manhours data
  const manhours = report.manhours || {};
  const pobPhe = Number(manhours.pobPheOses) || 0;
  const pobContr = Number(manhours.pobContractor) || 0;
  const hoursPhe = Number(manhours.hoursPobPheOses) || 0;
  const hoursContr = Number(manhours.hoursPobContractor) || 0;
  const manhoursPhe = pobPhe * hoursPhe;
  const manhoursContr = pobContr * hoursContr;
  const manhoursTotal = manhoursPhe + manhoursContr;

  // Get smart card data
  const smartCard = report.smartCard || {};

  // Get permits and activity sections
  const permits = Array.isArray(report.permit) ? report.permit : (Array.isArray(report.detail?.permit) ? report.detail.permit : []);
  const meetings = Array.isArray(report.meeting) ? report.meeting : (Array.isArray(report.detail?.meeting) ? report.detail.meeting : []);
  const drills = Array.isArray(report.drill) ? report.drill : (Array.isArray(report.detail?.drill) ? report.detail.drill : []);
  const trainings = Array.isArray(report.training) ? report.training : (Array.isArray(report.detail?.training) ? report.detail.training : []);
  const inspections = Array.isArray(report.inspections) ? report.inspections : (Array.isArray(report.detail?.inspections) ? report.detail.inspections : []);
  const preUseInspections = inspections.filter((i: any) => i.type === 'pre_use');
  const fieldInspections = inspections.filter((i: any) => i.type === 'field');
  const closedFieldInspections = fieldInspections.filter((item: any) => (Number(item.openFinding) <= 0 || !item.openFinding) && Number(item.closeFinding) > 0);

  // Kartu pintar observation count
  const kartuPintarCount = (Number(smartCard.unsafeAction) || 0) + 
                          (Number(smartCard.unsafeCondition) || 0) + 
                          (Number(smartCard.nearMiss) || 0) + 
                          (Number(smartCard.processSafety) || 0);

  // Get weather data
  const weatherData = report.highlight?.weather || report.detail?.highlight?.weather;

  // Get highlights
  const highlights = report.highlight || report.detail?.highlight || {};
  const rawOverstay = highlights.overstayPersonnel;
  const overstayPersonnel: Array<{ name: string; company: string; dob?: string | number }> = Array.isArray(rawOverstay)
    ? rawOverstay.filter((p: any) => {
        const days = parseInt(String(p.dob || p.daysOnBoard || ''), 10);
        return isNaN(days) ? true : days >= 21;
      })
    : (typeof rawOverstay === 'string' && rawOverstay.trim() !== ''
      ? [{ name: rawOverstay, company: '-', dob: '≥21' }]
      : []);

  // Filter HSSE issues: ALL Open Findings from BOTH Pre-Use AND Field inspections
  const preUseOpen = preUseInspections
    .filter((item: any) => Number(item.openFinding) > 0 || Number(item.outstandingFinding) > 0)
    .map((item: any) => ({ ...item, category: 'Pre-Use' }));
  const fieldOpen = fieldInspections
    .filter((item: any) => Number(item.openFinding) > 0 || Number(item.outstandingFinding) > 0)
    .map((item: any) => ({ ...item, category: 'Field' }));
  const hsseIssues = [...preUseOpen, ...fieldOpen];

  // Leading Indicators metrics for project report (6 consolidated cards)
  const leadingMetrics = [
    { label: 'Meeting', count: meetings.length, icon: 'message-square', color: 'text-blue-600', border: 'border-blue-500' },
    { label: 'Drill', count: drills.length, icon: 'flame', color: 'text-amber-600', border: 'border-amber-500' },
    { label: 'Training', count: trainings.length, icon: 'graduation-cap', color: 'text-emerald-600', border: 'border-emerald-500' },
    { label: 'PRE-USE INSPECT. / INSPECT.', count: `${preUseInspections.length} / ${fieldInspections.length}`, icon: 'clipboard-check', color: 'text-indigo-600', border: 'border-indigo-500' },
    { label: 'Kartu Pintar', count: kartuPintarCount, icon: 'sparkles', color: 'text-purple-600', border: 'border-purple-500' },
    { label: 'PTW', count: permits.length, icon: 'clipboard-list', color: 'text-sky-600', border: 'border-sky-500' },
  ];

  // Get supporting images
  const rawFiles = report.supportingFiles || report.detail?.supportingFiles || [];
  const images = rawFiles.filter((f: any) => {
    const isImage = f.fileType && typeof f.fileType === 'string' && f.fileType.startsWith('image/');
    const hasImageExt = f.fileName && typeof f.fileName === 'string' && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.fileName);
    return isImage || hasImageExt;
  });

  // HSE Logo path - use base64 for PDF generation
  function getLogoBase64(): string {
    try {
      const logoFullPath = resolveExistingUploadFile('HSE New Logo.png');
      if (logoFullPath && fs.existsSync(logoFullPath)) {
        const buffer = fs.readFileSync(logoFullPath);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch (error) {
      console.error('Error reading logo file:', error);
    }
    return `${env.server.uploadsUrl}/HSE New Logo.png`;
  }
  const logoPath = getLogoBase64();

  // Parse weather metrics
  const parseWeatherData = (data: string) => {
    if (!data) {
      return {
        wind: 'N/A',
        sky: 'N/A',
        sea: 'N/A'
      };
    }

    // Expected format: "Wind Speed (Knot): 12, Sky Condition: Partly Cloudy, Sea Level (m): 0.5"
    // Extract values based on labels for better robustness
    const windMatch = data.match(/Wind Speed.*?:?\s*(\d+(?:\.\d+)?)/i);
    const skyMatch = data.match(/Sky Condition.*?:?\s*([^,]+)/i);
    const seaMatch = data.match(/(?:Sea Level|Wave).*?:?\s*(\d+(?:\.\d+)?)/i);

    return {
      wind: windMatch ? windMatch[1] + ' Knots' : 'N/A',
      sky: skyMatch ? skyMatch[1].trim() : 'N/A',
      sea: seaMatch ? seaMatch[1] + ' m' : 'N/A'
    };
  };

  const weatherMetrics = parseWeatherData(weatherData);

  // Build lagging pyramid data
  const laggingPyramidData = isMarine ? [
    { label: 'Fatality', shortLabel: 'F', val: lagging.fatality || 0, color: 'bg-[#0b1e3b]' },
    { label: 'LTI', shortLabel: 'LTI', val: lagging.lti || 0, color: 'bg-[#102a52]' },
    { label: 'MTC', shortLabel: 'MTC', val: lagging.medicalTreatmentCase || 0, color: 'bg-[#163c70]' },
    { label: 'FAC', shortLabel: 'FAC', val: lagging.firstAid || 0, color: 'bg-[#005a9e]' },
    { label: 'Nearmiss', shortLabel: 'Nearmiss', val: lagging.nearMiss || 0, color: 'bg-[#0078d4]' },
    { label: 'Unsafe Act/Cond', shortLabel: 'Unsafe Act/Cond', val: (lagging.unsafeAction || 0) + (lagging.unsafeCondition || 0), color: 'bg-[#0091f2]' }
  ] : [
    { label: 'Fatality', shortLabel: 'F', val: `${lagging.fatality || 0}`, color: 'bg-[#0b1e3b]' },
    { label: 'LTI', shortLabel: 'LTI', val: `${lagging.lti || 0}`, color: 'bg-[#102a52]' },
    { label: 'RDWC', shortLabel: 'RDWC', val: `${lagging.restrictedWorkDayCase || 0}`, color: 'bg-[#163c70]' },
    { label: 'MTC', shortLabel: 'MTC', val: `${lagging.medicalTreatmentCase || 0}`, color: 'bg-[#005a9e]' },
    { label: 'First Aid', shortLabel: 'FA', val: `${lagging.firstAid || 0}`, color: 'bg-[#0078d4]' },
    { label: 'Near Miss', shortLabel: 'NM', val: `${lagging.nearMiss || 0}`, color: 'bg-[#0091f2]' },
    { label: 'Unsafe Action / Condition', shortLabel: 'UA/UC', val: `${smartCard.unsafeAction || 0}/${smartCard.unsafeCondition || 0}`, color: 'bg-[#1d70b8]' }
  ];

  // Build activities list
  const activities = [];
  if (report.meeting && report.meeting.length > 0) {
    activities.push({
      title: 'Meeting',
      type: report.meeting[0].description || 'Daily Meeting',
      participants: report.meeting[0].absencePercentage || 0,
      badgeColor: 'bg-blue-100 text-blue-700'
    });
  }
  if (report.training && report.training.length > 0) {
    activities.push({
      title: 'Training',
      type: report.training[0].description || 'Training Activity',
      participants: report.training[0].totalParticipants || 0,
      badgeColor: 'bg-cyan-100 text-cyan-700'
    });
  }
  if (report.drill && report.drill.length > 0) {
    activities.push({
      title: 'Drill',
      type: report.drill[0].description || 'Drill Activity',
      participants: report.drill[0].totalParticipants || 0,
      badgeColor: 'bg-sky-100 text-sky-700'
    });
  }

  // Aggregate activities for Marine report
  let marineMeetings: { title: string; count: number }[] = [];
  let marineDrills: { title: string; count: number }[] = [];
  let marineTrainings: { title: string; count: number }[] = [];

  if (isMarine) {
    const meetingLabels: any = {
      toolbox: 'Toolbox Meeting',
      toolboxTalk: 'Toolbox Talk',
      generalSafety: 'General Safety Meeting',
      safetyCommittee: 'Safety Committee Meeting',
      preJob: 'Pre-Job Safety Meeting',
      monthlySafety: 'Monthly Safety Meeting',
      hsseSiteOrientation: 'HSSE Site Orientation',
      marineContractorMeeting: 'Marine Contractor Meeting',
      safetyStandDownMeeting: 'Safety Stand Down Meeting',
      managementVisit: 'Management Visit',
      marineSafetyCampaign: 'Marine Safety Campaign',
      learningFromCampaignEvent: 'Learning from Campaign Event',
      others: 'Other Meeting'
    };
    const drillLabels: any = {
      fireDrill: 'Fire Drill',
      abandonDrill: 'Abandon Drill',
      musteringDrill: 'Mustering Drill',
      medievacDrill: 'Medievac Drill',
      h2sDrill: 'H2S Drill',
      oilPollutionPreventionDrill: 'Oil Pollution Prev.',
      steeringGearFailureDrill: 'Steering Gear Failure',
      manOverboardDrill: 'Manoverboard Drill',
      groundingDrill: 'Grounding Drill',
      firstAidDrill: 'First Aid Drill',
      collisionDrill: 'Collision Drill',
      dryDrill: 'Dry Drill',
      wetDrill: 'Wet Drill',
      othersDrill: 'Other Drill'
    };
    const trainingLabels: any = {
      clsr: 'CLSR Training',
      akhlak: 'AKHLAK Training',
      unsafeActionCategory: 'Unsafe Action Category',
      sika: 'SIKA Training',
      l2ra: 'L2RA Training',
      preSiteInduction: 'Pre-Site Induction',
      siteInduction: 'Site Induction',
      shipboardTraining: 'Shipboard Training',
      othersTraining: 'Other Training'
    };

    (report.meeting || []).forEach((m: any) => {
      Object.keys(meetingLabels).forEach(key => {
        if (m[key] === 1) {
          marineMeetings.push({ title: meetingLabels[key], count: m.absencePercentage || 0 });
        }
      });
    });
    (report.drill || []).forEach((d: any) => {
      Object.keys(drillLabels).forEach(key => {
        if (d[key] === 1) {
          marineDrills.push({ title: drillLabels[key], count: d.totalParticipants || 0 });
        }
      });
    });
    (report.training || []).forEach((t: any) => {
      Object.keys(trainingLabels).forEach(key => {
        if (t[key] === 1) {
          marineTrainings.push({ title: trainingLabels[key], count: t.totalParticipants || 0 });
        }
      });
    });
  }

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HSSE Daily Report - PHE OSES</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"><\/script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"><\/script>
  <!-- Google Fonts: Rubik -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet">
  <style>
    :root {
      --brand-primary: #0078D4;
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-300: #cbd5e1;
      --slate-600: #475569;
      --slate-800: #1e293b;
    }

    body { 
      font-family: 'Rubik', sans-serif;
      -webkit-font-smoothing: antialiased;
      background-color: #f1f5f9;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .report-card {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--slate-200);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
    }

    .report-card-header {
      padding: 12px 16px;
      background: var(--slate-50);
      border-bottom: 1px solid var(--slate-200);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .print-w-full {
      width: 100% !important;
      max-width: none !important;
    }

    .print-bg-azure {
      background-color: #0078D4 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pyramid-clip {
      clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
      -webkit-clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
    }

    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body class="min-h-screen bg-slate-100 p-4 text-slate-800">

    <!-- Main Header -->
    <header class="px-8 py-8 border-b-4 border-[#0078D4] flex justify-between items-center bg-gradient-to-r from-white to-slate-50 relative overflow-hidden">
      <!-- Decor background -->
      <div class="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl"></div>
      <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-50 rounded-full opacity-40 blur-2xl"></div>
      
      <div class="relative flex gap-6 items-center">
        <!-- Logo - Transparent without box -->
        <div class="flex-shrink-0 flex items-center justify-center" style="width: 140px; height: 140px;">
           <img src="${logoPath}" alt="Logo" class="w-full h-full object-contain drop-shadow-md" />
        </div>
        <!-- Title Section -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="bg-[#0078D4] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">HSSE Report</span>
            <span class="text-slate-300">|</span>
            <span class="text-[#0078D4] text-sm font-bold uppercase tracking-wide">${report.formType || 'Project'}</span>
          </div>
          <h1 class="text-3xl font-black text-slate-800 tracking-tight uppercase leading-tight">${projectName}</h1>
          <div class="flex items-center gap-2 text-slate-500 text-sm">
             <i data-lucide="map-pin" class="w-4 h-4 text-[#0078D4]"></i>
             <span class="font-medium">${projectInstance}</span>
             ${isMarine ? `<span class="w-1 h-1 bg-slate-300 rounded-full"></span><span class="font-bold text-[#0078D4]"><i data-lucide="ship" class="w-4 h-4 inline mr-1"></i>${report.vesselName || '-'}</span>` : ''}
          </div>
        </div>
      </div>
      
      <!-- Report Info Card -->
      <div class="relative">
        <div class="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-xl shadow-xl min-w-[180px]">
          <p class="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2">Report Date</p>
          <p class="text-2xl font-black tabular-nums text-white">${formattedDate}</p>
          <div class="mt-3 pt-3 border-t border-slate-700">
            <p class="text-[9px] font-bold text-slate-400 uppercase mb-1">Reporter</p>
            <p class="text-sm font-bold text-slate-200 truncate">${reporterName}</p>
          </div>
        </div>
      </div>
    </header>

  <!-- DASHBOARD GRID -->
  <div class="p-6 grid grid-cols-12 gap-6 print:gap-4 print:p-5 bg-slate-50">

    ${isMarine ? `
    <!-- MARINE GRID -->
    <div class="col-span-12 grid grid-cols-3 gap-6">
      
      <!-- COLUMN 1: Lagging, Free Days, Manhours -->
      <div class="flex flex-col gap-6">
        <!-- Lagging Indicators (Pyramid) -->
        <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="bg-slate-50 p-3 border-b border-slate-200">
            <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
              <i data-lucide="trending-down" class="w-4 h-4"></i>
              Lagging Indicators
            </h2>
          </div>
          <div class="p-4 flex items-center justify-center bg-white relative">
            <div class="w-full h-56 relative">
              <div class="w-full h-full pyramid-clip">
                <div class="flex flex-col h-full w-full">
                  ${laggingPyramidData.map(item => `
                    <div class="${item.color} flex-1 w-full flex items-center justify-center relative border-b border-white/10">
                      <span class="text-[9px] font-bold z-10 text-white">${item.shortLabel}: ${item.val}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Free Days -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white p-4 rounded border border-slate-200 shadow-sm text-center">
            <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">Free LTI (Days)</p>
            <p class="text-3xl font-bold text-green-600">${lagging.freeLtaDays || 0}</p>
          </div>
          <div class="bg-white p-4 rounded border border-slate-200 shadow-sm text-center">
            <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">Free RI (Days)</p>
            <p class="text-3xl font-bold text-green-600">${lagging.freeRiDays || 0}</p>
          </div>
        </div>

        <!-- Manhours -->
        <div class="bg-white p-5 rounded border border-slate-200 shadow-sm">
           <div class="flex justify-between items-center mb-2">
             <p class="text-[10px] text-slate-500 font-bold uppercase">Manhours (YTD)</p>
             <i data-lucide="clock" class="w-5 h-5 text-blue-400"></i>
           </div>
           <p class="text-4xl font-bold text-blue-700">${Number(report.manhoursSummary?.ytdManhours || 0).toLocaleString('id-ID')}</p>
        </div>

        <div class="bg-white p-5 rounded border border-slate-200 shadow-sm">
           <div class="flex justify-between items-center mb-2">
             <p class="text-[10px] text-slate-500 font-bold uppercase">Safe Manhours</p>
             <i data-lucide="shield-check" class="w-5 h-5 text-blue-400"></i>
           </div>
           <p class="text-4xl font-bold text-blue-700">${Number(safeManhours).toLocaleString('id-ID')}</p>
        </div>
      </div>

      <!-- COLUMN 2: Vessel Status, Operational Highlights -->
      <div class="flex flex-col gap-6">
        <!-- Vessel Status -->
        <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
              <i data-lucide="ship" class="w-5 h-5"></i>
              Vessel Status
            </h2>
            <span class="text-[10px] font-bold bg-blue-600 text-white px-3 py-1 rounded-full">
              Total: ${totalVessels}
            </span>
          </div>
          <div class="p-5 space-y-4">
            ${vesselStatusData.map(vc => `
              <div class="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <span class="text-sm text-slate-600 font-medium">${vc.type || 'Other'}</span>
                <span class="text-base font-bold text-slate-800">${vc.count}</span>
              </div>
            `).join('')}
            ${vesselStatusData.length === 0 ? '<p class="text-sm text-slate-400 text-center italic py-4">No active vessels found</p>' : ''}
          </div>
        </div>

        <!-- Operational Highlights -->
        <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="bg-slate-50 p-4 border-b border-slate-200">
            <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
              <i data-lucide="zap" class="w-5 h-5"></i>
              Operational Highlights
            </h2>
          </div>
          <div class="p-5 space-y-6">
            ${['SBU', 'CBU', 'NBU'].map(region => {
              const op = report.operations?.find((o: any) => o.region === region) || {};
              return `
                <div>
                  <div class="flex items-center gap-2 mb-3">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span class="text-sm font-bold text-slate-700 uppercase">${region}</span>
                  </div>
                  <div class="flex flex-wrap gap-2 pl-5">
                    ${op.currentHiPoActivity ? `<span class="bg-slate-100 text-slate-600 text-[10px] px-3 py-1.5 rounded border border-slate-200">${op.currentHiPoActivity}</span>` : ''}
                    ${op.forecastHiPoActivity ? `<span class="bg-blue-50 text-blue-600 text-[10px] px-3 py-1.5 rounded border border-blue-100">${op.forecastHiPoActivity}</span>` : ''}
                    ${!op.currentHiPoActivity && !op.forecastHiPoActivity ? '<span class="text-[10px] text-slate-400 italic">No activity recorded</span>' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- COLUMN 3: Drills & Meetings, Weather -->
      <div class="flex flex-col gap-6">
        <!-- Activities -->
        <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div class="bg-slate-50 p-4 border-b border-slate-200">
            <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
              <i data-lucide="users" class="w-5 h-5"></i>
              Activities
            </h2>
          </div>
          <div class="p-5 space-y-6">
            <!-- Meeting Section -->
            <div class="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Meeting</span>
              <div class="space-y-2">
                ${marineMeetings.length > 0 ? marineMeetings.map(m => `
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-800 font-rubik">${m.title}</span>
                    <span class="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold font-rubik">${m.count} Peserta</span>
                  </div>
                `).join('') : '<p class="text-xs italic text-slate-400">No meeting activity recorded</p>'}
              </div>
            </div>

            <!-- Training Section -->
            <div class="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Training</span>
              <div class="space-y-2">
                ${marineTrainings.length > 0 ? marineTrainings.map(t => `
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-800 font-rubik">${t.title}</span>
                    <span class="bg-cyan-50 text-cyan-600 text-[10px] px-2 py-0.5 rounded-full font-bold font-rubik">${t.count} Peserta</span>
                  </div>
                `).join('') : '<p class="text-xs italic text-slate-400">No training activity recorded</p>'}
              </div>
            </div>

            <!-- Drill Section -->
            <div class="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Drill</span>
              <div class="space-y-2">
                ${marineDrills.length > 0 ? marineDrills.map(d => `
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-800 font-rubik">${d.title}</span>
                    <span class="bg-sky-50 text-sky-600 text-[10px] px-2 py-0.5 rounded-full font-bold font-rubik">${d.count} Peserta</span>
                  </div>
                `).join('') : '<p class="text-xs italic text-slate-400">No drill activity recorded</p>'}
              </div>
            </div>
          </div>
        </div>

        <!-- Weather Conditions -->
        <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <div class="bg-slate-50 p-4 border-b border-slate-200">
            <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
              <i data-lucide="cloud-sun" class="w-5 h-5"></i>
              Weather Conditions
            </h2>
          </div>
          <div class="p-5 grid grid-cols-3 gap-4 divide-x divide-slate-100">
            ${['SBU', 'CBU', 'NBU'].map(region => {
              const op = report.operations?.find((o: any) => o.region === region) || {};
              return `
                <div class="px-2 first:pl-0">
                  <div class="text-center font-bold text-slate-700 text-xs mb-4 bg-slate-50 py-1.5 rounded border border-slate-100">${region}</div>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between text-[11px]">
                      <i data-lucide="droplets" class="w-4 h-4 text-blue-400"></i>
                      <span class="text-slate-600">${op.seaLevel || '0'}m</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                      <i data-lucide="wind" class="w-4 h-4 text-sky-400"></i>
                      <span class="text-slate-600">${op.windSpeed || '0'}kn</span>
                    </div>
                    <div class="flex items-start justify-between text-[11px]">
                      <i data-lucide="sun" class="w-4 h-4 text-amber-400 mt-0.5"></i>
                      <span class="text-slate-600 text-right ml-2 leading-tight">${op.skyCondition || 'Clear'}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
    ` : `
    <!-- COMBINED COLUMN 1 & 2 (Left Section) -->
    <div class="col-span-12 flex flex-col gap-6">
      
      <!-- Top Row: Manhours, Leading and Lagging Indicators -->
      <div class="grid grid-cols-3 gap-6 auto-rows-fr">
        
        <!-- Manhours Card -->
        <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div class="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
            <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
              <i data-lucide="clock" class="w-4 h-4"></i>
              Manhours & POB
            </h2>
            ${report.workLocationName || report.detail?.identity?.workLocationName ? `
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                ${report.workLocationName || report.detail?.identity?.workLocationName}
              </span>
            ` : ''}
          </div>
          <div class="p-3.5 flex flex-col justify-between gap-2.5 flex-grow">
            <div class="grid grid-cols-2 gap-2.5">
              <div class="bg-white p-2.5 rounded border-l-4 border-blue-600 shadow-sm">
                <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">POB PHE</p>
                <p class="text-xl font-bold text-slate-800">${pobPhe}</p>
              </div>
              <div class="bg-white p-2.5 rounded border-l-4 border-cyan-500 shadow-sm">
                <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">POB Contr.</p>
                <p class="text-xl font-bold text-slate-800">${pobContr}</p>
              </div>
              <div class="bg-slate-50 p-2.5 rounded border border-slate-200">
                <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Manhours PHE</p>
                <p class="text-base font-bold text-slate-700">${manhoursPhe.toLocaleString('id-ID')}</p>
              </div>
              <div class="bg-slate-50 p-2.5 rounded border border-slate-200">
                <p class="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Manhours Contr.</p>
                <p class="text-base font-bold text-slate-700">${manhoursContr.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div class="bg-blue-50/70 p-2.5 rounded border border-blue-100 flex items-center justify-between px-3">
              <p class="text-[10px] text-blue-800 font-bold uppercase">Manhours Total</p>
              <p class="text-base font-extrabold text-blue-900">${manhoursTotal.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        <!-- Leading Indicators (6 Count Tiles) -->
        <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div class="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
            <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
              <i data-lucide="shield" class="w-4 h-4"></i>
              Leading Indicators
            </h2>
            <span class="text-[9px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
              6 Activities
            </span>
          </div>
          <div class="p-3.5 flex flex-col justify-between gap-2.5 flex-grow h-full">
            <div class="flex-1 grid grid-cols-3 gap-2.5">
              ${leadingMetrics.slice(0, 3).map(metric => `
                <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 border-l-4 ${metric.border} shadow-sm flex flex-col justify-between h-full">
                  <div class="flex items-start justify-between gap-1 mb-1">
                    <span class="text-[9px] font-bold text-slate-600 uppercase tracking-tight whitespace-normal break-words leading-tight" title="${metric.label}">${metric.label}</span>
                    <i data-lucide="${metric.icon}" class="w-3.5 h-3.5 ${metric.color} shrink-0"></i>
                  </div>
                  <span class="text-xl font-extrabold text-slate-800 leading-none mt-auto pt-1">${metric.count}</span>
                </div>
              `).join('')}
            </div>
            <div class="flex-1 grid grid-cols-3 gap-2.5">
              ${leadingMetrics.slice(3, 6).map(metric => `
                <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 border-l-4 ${metric.border} shadow-sm flex flex-col justify-between h-full">
                  <div class="flex items-start justify-between gap-1 mb-1">
                    <span class="text-[9px] font-bold text-slate-600 uppercase tracking-tight whitespace-normal break-words leading-tight" title="${metric.label}">${metric.label}</span>
                    <i data-lucide="${metric.icon}" class="w-3.5 h-3.5 ${metric.color} shrink-0"></i>
                  </div>
                  <span class="text-xl font-extrabold text-slate-800 leading-none mt-auto pt-1">${metric.count}</span>
                </div>
              `).join('')}
            </div>
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <div class="flex items-center gap-1.5">
                <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-500"></i>
                <span>Recorded activities & observations</span>
              </div>
              <span class="font-bold text-slate-700">Total: ${meetings.length + drills.length + trainings.length + inspections.length + kartuPintarCount + permits.length}</span>
            </div>
          </div>
        </div>

        <!-- Lagging Indicators (Pyramid + Description) -->
        <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div class="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
            <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
              <i data-lucide="trending-down" class="w-4 h-4"></i>
              Lagging Indicators
            </h2>
            <span class="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
              LTA: ${lagging.freeLtaDays || 0}d
            </span>
          </div>
          <div class="p-3 flex items-center justify-center flex-grow bg-white relative">
            <div class="w-full h-48 relative">
              <div class="w-full h-full pyramid-clip">
                <div class="flex flex-col h-full w-full">
                  ${laggingPyramidData.map(item => `
                    <div class="${item.color} flex-1 w-full flex items-center justify-center relative border-b border-white/10">
                      <span class="text-[8px] font-bold z-10 text-white tracking-wider">${item.shortLabel}: ${item.val}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          <!-- Lagging Indicator Description -->
          <div class="p-3 border-t border-slate-100 bg-slate-50/70">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tight block mb-1">
              Description
            </span>
            <p class="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line break-words">
              ${lagging.description?.trim() ? lagging.description : '-'}
            </p>
          </div>
        </div>

      </div>

      <!-- ACTIVITIES SECTION: Full Width with 7 Sequential Detail Tables -->
      <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col avoid-break">
        <div class="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
          <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
            <i data-lucide="users" class="w-4 h-4"></i>
            Activities Detail
          </h2>
          <span class="text-xs text-slate-500 font-medium">
            7 Program Sections
          </span>
        </div>

        <div class="p-4 flex flex-col gap-6">

          <!-- 1. Meeting Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="message-square" class="w-3.5 h-3.5 text-blue-600"></i>
                1. Meeting Activity
              </div>
              <span class="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                Total: ${meetings.length}
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 5%" />
                  <col style="width: 20%" />
                  <col style="width: 65%" />
                  <col style="width: 10%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Jenis Meeting</th>
                    <th class="px-3 py-2">Meeting Agenda</th>
                    <th class="px-3 py-2 text-center">Total Peserta</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${meetings.length > 0 ? meetings.map((m: any, idx: number) => `
                    <tr class="hover:bg-blue-50/50 transition-colors">
                      <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">${idx + 1}</td>
                      <td class="px-3 py-2 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${m.jenisMeeting || 'Toolbox Meeting'}</td>
                      <td class="px-3 py-2 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${m.description || '-'}</td>
                      <td class="px-3 py-2 text-center align-top font-bold text-blue-700">${m.absencePercentage || 0}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="4" class="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Meeting</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 2. Drill Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="flame" class="w-3.5 h-3.5 text-amber-600"></i>
                2. Drill Activity
              </div>
              <span class="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                Total: ${drills.length}
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 5%" />
                  <col style="width: 20%" />
                  <col style="width: 65%" />
                  <col style="width: 10%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Jenis Drill</th>
                    <th class="px-3 py-2">Skenario / Deskripsi Drill</th>
                    <th class="px-3 py-2 text-center">Total Peserta</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${drills.length > 0 ? drills.map((d: any, idx: number) => {
                    const drillTypes = [];
                    if (d.fireDrill) drillTypes.push('Fire Drill');
                    if (d.abandonDrill) drillTypes.push('Abandon Drill');
                    if (d.musteringDrill) drillTypes.push('Mustering Drill');
                    if (d.medievacDrill) drillTypes.push('Medievac Drill');
                    if (d.h2sDrill) drillTypes.push('H2S Drill');
                    if (d.oilPollutionPreventionDrill) drillTypes.push('Oil Pollution Prev.');
                    if (d.firstAidDrill) drillTypes.push('First Aid Drill');
                    if (d.othersDrill) drillTypes.push('Others');
                    const typeLabel = drillTypes.length > 0 ? drillTypes.join(', ') : 'Drill Exercise';

                    return `
                      <tr class="hover:bg-amber-50/30 transition-colors">
                        <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">${idx + 1}</td>
                        <td class="px-3 py-2 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${typeLabel}</td>
                        <td class="px-3 py-2 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${d.description || '-'}</td>
                        <td class="px-3 py-2 text-center align-top font-bold text-amber-700">${d.totalParticipants || 0}</td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="4" class="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Drill</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. Training Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-emerald-600"></i>
                3. Training Activity
              </div>
              <span class="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                Total: ${trainings.length}
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 5%" />
                  <col style="width: 20%" />
                  <col style="width: 65%" />
                  <col style="width: 10%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Jenis Training</th>
                    <th class="px-3 py-2">Topik / Deskripsi Training</th>
                    <th class="px-3 py-2 text-center">Total Peserta</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${trainings.length > 0 ? trainings.map((t: any, idx: number) => {
                    const trainingTypes = [];
                    if (t.clsr) trainingTypes.push('CLSR');
                    if (t.akhlak) trainingTypes.push('AKHLAK');
                    if (t.unsafeActionCategory) trainingTypes.push('Unsafe Action Cat.');
                    if (t.sika) trainingTypes.push('SIKA');
                    if (t.l2ra) trainingTypes.push('L2RA');
                    if (t.siteInduction) trainingTypes.push('Site Induction');
                    if (t.preSiteInduction) trainingTypes.push('Pre-Site Induction');
                    if (t.shipboardTraining) trainingTypes.push('Shipboard Training');
                    if (t.othersTraining) trainingTypes.push('Others');
                    const typeLabel = trainingTypes.length > 0 ? trainingTypes.join(', ') : 'Safety Training';

                    return `
                      <tr class="hover:bg-emerald-50/30 transition-colors">
                        <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">${idx + 1}</td>
                        <td class="px-3 py-2 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${typeLabel}</td>
                        <td class="px-3 py-2 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${t.description || '-'}</td>
                        <td class="px-3 py-2 text-center align-top font-bold text-emerald-700">${t.totalParticipants || 0}</td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="4" class="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Training</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          ${options.showInspectionTables ? `
          <!-- 4. Pre-Use Inspection Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="clipboard-check" class="w-3.5 h-3.5 text-indigo-600"></i>
                4. Pre-Use Inspection
              </div>
              <span class="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                Total: ${preUseInspections.length}
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 5%" />
                  <col style="width: 22%" />
                  <col style="width: 28%" />
                  <col style="width: 21%" />
                  <col style="width: 13%" />
                  <col style="width: 11%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Item / Alat Diinspeksi</th>
                    <th class="px-3 py-2">Temuan (Finding)</th>
                    <th class="px-3 py-2">Tindak Lanjut (Follow-Up)</th>
                    <th class="px-3 py-2 text-center">Status</th>
                    <th class="px-3 py-2 text-center">Deadline</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${preUseInspections.length > 0 ? preUseInspections.map((p: any, idx: number) => {
                    const statusText = p.openFinding > 0 ? 'Open Finding' : (p.closeFinding > 0 ? 'Close Finding' : (p.noIssue > 0 ? 'No Issue' : 'Complete'));
                    const statusColor = p.openFinding > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';

                    return `
                      <tr class="hover:bg-indigo-50/30 transition-colors">
                        <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">${idx + 1}</td>
                        <td class="px-3 py-2 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${p.description || '-'}</td>
                        <td class="px-3 py-2 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${p.finding || '-'}</td>
                        <td class="px-3 py-2 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${p.followUp || '-'}</td>
                        <td class="px-3 py-2 text-center align-top">
                          <span class="text-[9px] px-2 py-0.5 rounded-full font-bold border ${statusColor}">
                            ${statusText}
                          </span>
                        </td>
                        <td class="px-3 py-2 text-center text-slate-500 font-mono align-top whitespace-nowrap text-[9px]">${p.deadline || '-'}</td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="6" class="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Pre-Use Inspection</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <!-- 5. Inspection (Field) Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="search" class="w-3.5 h-3.5 text-teal-600"></i>
                5. Inspection (Field)
              </div>
              <span class="text-[10px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                Total: ${closedFieldInspections.length}
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 5%" />
                  <col style="width: 22%" />
                  <col style="width: 28%" />
                  <col style="width: 21%" />
                  <col style="width: 13%" />
                  <col style="width: 11%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Area / Objek Inspeksi</th>
                    <th class="px-3 py-2">Temuan (Finding)</th>
                    <th class="px-3 py-2">Tindak Lanjut (Follow-Up)</th>
                    <th class="px-3 py-2 text-center">Status</th>
                    <th class="px-3 py-2 text-center">Deadline</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${closedFieldInspections.length > 0 ? closedFieldInspections.map((f: any, idx: number) => {
                    const statusText = f.openFinding > 0 ? 'Open Finding' : (f.closeFinding > 0 ? 'Close Finding' : (f.noIssue > 0 ? 'No Issue' : 'Complete'));
                    const statusColor = f.openFinding > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';

                    return `
                      <tr class="hover:bg-teal-50/30 transition-colors">
                        <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">${idx + 1}</td>
                        <td class="px-3 py-2 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${f.description || '-'}</td>
                        <td class="px-3 py-2 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${f.finding || '-'}</td>
                        <td class="px-3 py-2 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${f.followUp || '-'}</td>
                        <td class="px-3 py-2 text-center align-top">
                          <span class="text-[9px] px-2 py-0.5 rounded-full font-bold border ${statusColor}">
                            ${statusText}
                          </span>
                        </td>
                        <td class="px-3 py-2 text-center text-slate-500 font-mono align-top whitespace-nowrap text-[9px]">${f.deadline || '-'}</td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="6" class="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Inspection (Close Finding)</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>
          ` : ''}

          <!-- 6. Kartu Pintar Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-purple-600"></i>
                6. Kartu Pintar
              </div>
              <span class="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                Total Observasi: ${kartuPintarCount}
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 5%" />
                  <col style="width: 55%" />
                  <col style="width: 10%" />
                  <col style="width: 10%" />
                  <col style="width: 10%" />
                  <col style="width: 10%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Deskripsi / Pengamatan</th>
                    <th class="px-3 py-2 text-center">Unsafe Action</th>
                    <th class="px-3 py-2 text-center">Unsafe Condition</th>
                    <th class="px-3 py-2 text-center">Near Miss</th>
                    <th class="px-3 py-2 text-center">Process Safety</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr class="hover:bg-purple-50/30 transition-colors">
                    <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">1</td>
                    <td class="px-3 py-2 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                      ${smartCard.description || 'Laporan observasi kartu pintar'}
                    </td>
                    <td class="px-3 py-2 text-center align-top font-bold text-blue-700">${smartCard.unsafeAction || 0}</td>
                    <td class="px-3 py-2 text-center align-top font-bold text-sky-600">${smartCard.unsafeCondition || 0}</td>
                    <td class="px-3 py-2 text-center align-top font-bold text-cyan-600">${smartCard.nearMiss || 0}</td>
                    <td class="px-3 py-2 text-center align-top font-bold text-slate-600">${smartCard.processSafety || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 7. Permit To Work Table -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="clipboard-list" class="w-3.5 h-3.5 text-sky-600"></i>
                7. Permit To Work
              </div>
              <span class="text-[10px] font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                Active: ${permits.length}
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 4%" />
                  <col style="width: 6%" />
                  <col style="width: 34%" />
                  <col style="width: 13%" />
                  <col style="width: 13%" />
                  <col style="width: 10%" />
                  <col style="width: 10%" />
                  <col style="width: 10%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Type</th>
                    <th class="px-3 py-2">Description</th>
                    <th class="px-3 py-2">PTW #</th>
                    <th class="px-3 py-2">Location</th>
                    <th class="px-3 py-2 text-center">RA</th>
                    <th class="px-3 py-2">Authority</th>
                    <th class="px-3 py-2">Controller</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${permits.length > 0 ? permits.map((ptw: any, idx: number) => `
                    <tr class="hover:bg-blue-50/40 transition-colors">
                      <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">${idx + 1}</td>
                      <td class="px-3 py-2 align-top">
                        <span class="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase text-[9px] inline-flex items-center justify-center min-w-[24px] text-center">
                          ${(ptw.type ? ptw.type.charAt(0) : (ptw.description?.trim().charAt(0) || 'W')).toUpperCase()}
                        </span>
                      </td>
                      <td class="px-3 py-2 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                        ${ptw.description || 'N/A'}
                      </td>
                      <td class="px-3 py-2 text-slate-600 align-top font-mono text-[9px] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${ptw.ptwNumber || ptw.noPTW || 'N/A'}</td>
                      <td class="px-3 py-2 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${ptw.location || 'N/A'}</td>
                      <td class="px-3 py-2 text-slate-600 align-top font-mono text-[9px] text-center whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${ptw.raJsaa || ptw.RA_JSA || 'N/A'}</td>
                      <td class="px-3 py-2 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${ptw.performingAuthority || 'N/A'}</td>
                      <td class="px-3 py-2 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${ptw.siteController || 'N/A'}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="8" class="px-3 py-3 text-center text-slate-400 italic">Tidak ada data Permit To Work</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <!-- DAILY HIGHLIGHTS SECTION: Full Width with Daily Activities, Next Plan, Overstay Table, and HSSE Issues Table -->
      <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col avoid-break">
        <div class="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
          <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            Daily Highlights
          </h2>
          <span class="text-xs text-slate-500 font-medium">Activities, Next Plan, Overstay Personnel & HSSE Issues</span>
        </div>

        <div class="p-4 flex flex-col gap-5">
          <!-- Activities & Next Plan Row -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
              <p class="text-blue-700 font-bold uppercase text-xs mb-2 flex items-center gap-1.5">
                <span class="w-2 h-2 bg-blue-600 rounded-full"></span>
                Daily Activities
              </p>
              <p class="text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] pl-3 border-l-2 border-blue-400">
                ${highlights.dailyActivities || 'Tidak ada catatan aktivitas hari ini.'}
              </p>
            </div>
            <div class="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
              <p class="text-cyan-700 font-bold uppercase text-xs mb-2 flex items-center gap-1.5">
                <span class="w-2 h-2 bg-cyan-600 rounded-full"></span>
                Daily Next Plan
              </p>
              <p class="text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] pl-3 border-l-2 border-cyan-400">
                ${highlights.dailyNextPlan || 'Tidak ada rencana aktivitas berikutnya.'}
              </p>
            </div>
          </div>

          <!-- Table Overstay Personnel List -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="clock" class="w-3.5 h-3.5 text-amber-600"></i>
                Overstay Personnel List (DOB ≥ 21 Hari)
              </div>
              <span class="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                Total: ${overstayPersonnel.length} Personel
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 6%" />
                  <col style="width: 42%" />
                  <col style="width: 34%" />
                  <col style="width: 18%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Nama Pekerja</th>
                    <th class="px-3 py-2">Perusahaan</th>
                    <th class="px-3 py-2 text-center">Hari On Duty (DOB)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${overstayPersonnel.length > 0 ? overstayPersonnel.map((p: any, idx: number) => `
                    <tr class="hover:bg-amber-50/20 transition-colors">
                      <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">${idx + 1}</td>
                      <td class="px-3 py-2 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${p.name || p.employeeName || '-'}</td>
                      <td class="px-3 py-2 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${p.company || '-'}</td>
                      <td class="px-3 py-2 text-center font-bold text-amber-700 align-top">
                        ${p.dob ? `${p.dob} Hari` : '≥ 21 Hari'}
                      </td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="4" class="px-3 py-3 text-center text-slate-400 italic">Tidak ada personel overstay (semua &lt; 21 hari)</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Table HSSE Issues -->
          <div class="border border-slate-200 rounded-lg overflow-hidden avoid-break">
            <div class="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div class="font-bold text-slate-800 text-xs flex items-center gap-2">
                <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-red-600"></i>
                Table HSSE Issues
              </div>
              <span class="text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                Total Issues: ${hsseIssues.length}
              </span>
            </div>
            <div class="w-full overflow-hidden">
              <table class="w-full min-w-full table-fixed text-[10px] text-left">
                <colgroup>
                  <col style="width: 5%" />
                  <col style="width: 21%" />
                  <col style="width: 13%" />
                  <col style="width: 28%" />
                  <col style="width: 22%" />
                  <col style="width: 11%" />
                </colgroup>
                <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2 text-center bg-slate-100">No</th>
                    <th class="px-3 py-2">Objek / Area Inspeksi</th>
                    <th class="px-3 py-2 text-center">Status</th>
                    <th class="px-3 py-2">Deskripsi Temuan</th>
                    <th class="px-3 py-2">Tindak Lanjut</th>
                    <th class="px-3 py-2 text-center">Deadline</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${hsseIssues.length > 0 ? hsseIssues.map((issue: any, idx: number) => {
                    const statusText = issue.openFinding > 0 ? 'Open Finding' : (issue.closeFinding > 0 ? 'Close Finding' : 'Issue');
                    const statusColor = issue.openFinding > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';

                    return `
                      <tr class="hover:bg-red-50/20 transition-colors">
                        <td class="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/30 align-top">${idx + 1}</td>
                        <td class="px-3 py-2 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                            ${issue.category ? `
                              <span style="font-size: 8px; font-weight: bold; padding: 2px 5px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${issue.category === 'Pre-Use' ? '#fef3c7' : '#dbeafe'}; color: ${issue.category === 'Pre-Use' ? '#92400e' : '#1e40af'}; border: 1px solid ${issue.category === 'Pre-Use' ? '#fcd34d' : '#93c5fd'};">
                                ${issue.category}
                              </span>
                            ` : ''}
                            <span>${issue.description || '-'}</span>
                          </div>
                        </td>
                        <td class="px-3 py-2 text-center align-top">
                          <span class="text-[9px] px-2 py-0.5 rounded-full font-bold border ${statusColor}">
                            ${statusText}
                          </span>
                        </td>
                        <td class="px-3 py-2 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${issue.finding || '-'}</td>
                        <td class="px-3 py-2 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">${issue.followUp || '-'}</td>
                        <td class="px-3 py-2 text-center text-slate-500 font-mono align-top whitespace-nowrap text-[9px]">${issue.deadline || '-'}</td>
                      </tr>
                    `;
                  }).join('') : `
                    <tr>
                      <td colspan="6" class="px-3 py-3 text-center text-slate-400 italic">Tidak ada catatan HSSE Issues (semua temuan closed/aman)</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <!-- WEATHER & ENVIRONMENT SECTION: Full Width below Highlights -->
      <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden avoid-break">
        <div class="bg-slate-50 p-3.5 border-b border-slate-200">
          <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
            <i data-lucide="cloud-sun" class="w-4 h-4"></i>
            Weather & Environment
          </h2>
        </div>
        <div class="grid grid-cols-3 divide-x divide-slate-100">
          <div class="p-4 text-center">
            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Wind Speed</div>
            <div class="flex items-center justify-center gap-2 text-blue-700">
              <i data-lucide="wind" class="w-5 h-5 text-sky-500"></i>
              <span class="text-base font-bold">${weatherMetrics.wind}</span>
            </div>
          </div>
          <div class="p-4 text-center">
            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Sky Condition</div>
            <div class="flex items-center justify-center gap-2 text-blue-700">
              <i data-lucide="cloud" class="w-5 h-5 text-blue-500"></i>
              <span class="text-base font-bold leading-tight break-words">${weatherMetrics.sky}</span>
            </div>
          </div>
          <div class="p-4 text-center">
            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Sea Level</div>
            <div class="flex items-center justify-center gap-2 text-blue-700">
              <i data-lucide="droplets" class="w-5 h-5 text-cyan-500"></i>
              <span class="text-base font-bold">${weatherMetrics.sea}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
    `}

    <!-- SUPPORTING IMAGES SECTION: 3 Columns per row -->
    <div class="col-span-12 mt-2 avoid-break">
      <div class="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div class="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
          <h2 class="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
            <i data-lucide="image" class="w-4 h-4"></i>
            Image Attachments
          </h2>
          <span class="text-xs text-slate-500 font-medium">Total: ${images.length} Lampiran</span>
        </div>
        <div class="p-5">
          ${images.length > 0 ? `
          <div class="grid grid-cols-3 gap-6">
            ${(await Promise.all(images.map(async (img: any) => {
              const base64Image = await getImageBase64(report.id, img.filePath, img.fileName, true);
              const imageSrc = base64Image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="%23f1f5f9" width="400" height="300"/><text fill="%2394a3b8" font-family="sans-serif" font-size="14" dy="5" font-weight="bold" x="50%" y="50%" text-anchor="middle">Image Not Found</text></svg>';
              return `
              <div class="flex flex-col gap-2.5 bg-slate-50/60 p-3 rounded-lg border border-slate-200 shadow-sm">
                <div class="relative bg-slate-100 rounded overflow-hidden border border-slate-200 aspect-[4/3] flex items-center justify-center p-2">
                  <img src="${imageSrc}" alt="${img.fileName || 'Attachment'}" class="max-w-full max-h-full object-contain" />
                  <div class="absolute top-2 left-2">
                     <span class="bg-[#0078D4]/90 text-white text-[9px] px-2 py-0.5 rounded uppercase font-bold backdrop-blur-sm shadow-sm">${img.section || 'General'}</span>
                  </div>
                </div>
                ${img.note ? `<p class="text-xs text-slate-600 font-medium px-1 leading-snug">${img.note}</p>` : ''}
              </div>
            `;
            }))).join('')}
          </div>
          ` : `
          <div class="py-10 flex flex-col items-center justify-center text-slate-400">
            <i data-lucide="image-off" class="w-10 h-10 mb-2 opacity-20"></i>
            <p class="text-sm italic">No image attachments provided</p>
          </div>
          `}
        </div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <footer class="bg-white border-t border-slate-200 p-3 text-center text-[10px] text-slate-400 print:bg-white print:border-t">
    <span class="font-semibold text-slate-500">Project HSSE Report System</span> • PHE OSES • Generated ${formattedDate}
  </footer>

</div>

<!-- Initialize Lucide Icons -->
<script>
  lucide.createIcons();
<\/script>

</body>
</html>
  `;
}
