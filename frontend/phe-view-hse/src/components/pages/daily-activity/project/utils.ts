import { formList } from "@/components/pages/daily-report/create/lib/project-template";

/**
 * Converts project data to markdown text format
 * @param values - The project data values
 * @param template - The project template (optional, uses formList by default)
 * @returns Markdown formatted string
 */
export const convertProjectDataToMarkdown = (
  values: Record<string, any>,
  template: Record<string, any> = formList
): string => {
  if (!values) return "";

  // Extract identity information
  const identity = values?.identity || {};
  const reportDate = identity?.reportDate
    ? new Date(identity.reportDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  let markdown = `# Daily HSSE Report Summary\n\n`;

  // Report header
  markdown += `**Report Date:** ${reportDate}\n`;
  markdown += `**Project:** ${identity?.subtype || ""}\n`;
  markdown += `**Reported By:** ${identity?.reportedBy || ""} / ${
    identity?.instansi || ""
  }\n\n`;
  markdown += `---\n\n`;

  // Safety Performance section (Lagging Indicator)
  const lagging = values?.lagging || {};
  markdown += `## 🚨 Safety Performance (Lagging Indicators)\n`;
  markdown += `- **Status:** ${
    lagging?.statusFreeLtaRi ? "Free LTA & Free RI" : "Not Free"
  }\n`;

  if (lagging?.freeLtaDays !== undefined) {
    markdown += `- **Free LTA Days:** ${lagging.freeLtaDays}\n`;
  }

  if (lagging?.freeRiDays !== undefined) {
    markdown += `- **Free RI Days:** ${lagging.freeRiDays}\n`;
  }

  // Incidents summary
  const incidents = [
    { label: "Fatality", value: lagging?.fatality },
    { label: "LTI", value: lagging?.lti },
    { label: "RWDC", value: lagging?.restrictedWorkDayCase },
    { label: "MTC", value: lagging?.medicalTreatmentCase },
    { label: "First Aid", value: lagging?.firstAid },
    { label: "Near Miss", value: lagging?.nearMiss },
    { label: "UA", value: lagging?.unsafeAction },
    { label: "UC", value: lagging?.unsafeCondition },
    { label: "Environmental Damage", value: lagging?.environmentalDamage },
    { label: "Property Damage", value: lagging?.propertyDamage },
  ].filter((item) => item.value !== undefined && item.value > 0);

  if (incidents.length > 0) {
    markdown += `- **Incidents:**\n`;
    incidents.forEach((incident) => {
      markdown += `  - ${incident.label}: ${incident.value}\n`;
    });
  } else {
    markdown += `- **Incidents:** 0 (All categories including Recordable, Fatality, LTI, etc.)\n`;
  }

  markdown += `\n`;

  // Manpower & Hours section
  const manHours = values?.manhours || {};
  const manHoursSummary = values?.manhoursSummary || {};
  const pobTotal =
    (manHours?.pobPheOses || 0) + (manHours?.pobContractor || 0);

  markdown += `## 👷 Manpower & Hours\n`;
  markdown += `- **Personnel On Board (POB):** ${pobTotal}\n`;

  if (
    manHours?.pobPheOses !== undefined ||
    manHours?.pobContractor !== undefined
  ) {
    markdown += `  - PHE OSES: ${manHours?.pobPheOses || 0}\n`;
    markdown += `  - Contractor: ${manHours?.pobContractor || 0}\n`;
  }

  if (manHoursSummary?.todayManhours !== undefined) {
    markdown += `- **Manhours Today:** ${manHoursSummary.todayManhours}\n`;
  }

  if (manHoursSummary?.todayMandays !== undefined) {
    markdown += `- **Mandays Today:** ${manHoursSummary.todayMandays}\n`;
  }

  if (manHoursSummary?.ytdMandays !== undefined) {
    markdown += `- **YTD Mandays:** ${manHoursSummary.ytdMandays?.toLocaleString()}\n`;
  }

  if (manHoursSummary?.ytdManhours !== undefined) {
    markdown += `- **YTD Manhours:** ${manHoursSummary.ytdManhours?.toLocaleString()}\n`;
  }

  markdown += `\n`;

  // Meetings & Engagements section
  const meeting = values?.meeting?.[0] || {};
  const meetingSummary = values?.meetingSummary || {};
  const todayMeetings =
    (meeting?.toolbox || 0) +
    (meeting?.preJob || 0) +
    (meeting?.generalSafety || 0) +
    (meeting?.safetyCommittee || 0) +
    (meeting?.others || 0);

  markdown += `## 📋 Meetings & Engagements\n`;
  markdown += `- **Meetings Today:** ${todayMeetings}\n`;

  const meetingsDetail = [
    { label: "Toolbox Meeting", value: meeting?.toolbox },
    { label: "Pre-Job Meeting", value: meeting?.preJob },
    { label: "General Safety Meeting", value: meeting?.generalSafety },
    { label: "Safety Committee Meeting", value: meeting?.safetyCommittee },
    { label: "Other Meeting", value: meeting?.others },
  ].filter((item) => item.value !== undefined && item.value > 0);

  if (meetingsDetail.length > 0) {
    meetingsDetail.forEach((m) => {
      markdown += `  - ${m.label}: ${m.value}\n`;
    });
  }

  if (meetingSummary?.ytdMeeting !== undefined) {
    markdown += `- **YTD Meetings:** ${meetingSummary.ytdMeeting}\n`;
  }

  markdown += `\n`;

  // Training section
  const training = values?.training?.[0] || {};
  const trainingSummary = values?.trainingSummary || {};
  const todayTrainings =
    (training?.clsr || 0) +
    (training?.akhlak || 0) +
    (training?.unsafeActionCategory || 0) +
    (training?.sika || 0) +
    (training?.l2ra || 0) +
    (training?.preSiteInduction || 0) +
    (training?.siteInduction || 0) +
    (training?.othersTraining || 0);

  markdown += `## 🎓 Training\n`;
  markdown += `- **Training Sessions Today:** ${todayTrainings}\n`;

  const trainingsDetail = [
    { label: "CLSR", value: training?.clsr },
    { label: "AKHLAK", value: training?.akhlak },
    { label: "Unsafe Action Category", value: training?.unsafeActionCategory },
    { label: "SIKA", value: training?.sika },
    { label: "L2RA", value: training?.l2ra },
    { label: "Pre Site Induction", value: training?.preSiteInduction },
    { label: "Site Induction", value: training?.siteInduction },
    { label: "Other Training", value: training?.othersTraining },
  ].filter((item) => item.value !== undefined && item.value > 0);

  if (trainingsDetail.length > 0) {
    trainingsDetail.forEach((t) => {
      markdown += `  - ${t.label}: ${t.value}\n`;
    });
  }

  if (trainingSummary?.ytdTraining !== undefined) {
    markdown += `- **YTD Training:** ${trainingSummary.ytdTraining}\n`;
  }

  markdown += `\n`;

  // Drills section
  const drill = values?.drill?.[0] || {};
  const drillSummary = values?.drillSummary || {};
  const todayDrills =
    (drill?.fireDrill || 0) +
    (drill?.abandonDrill || 0) +
    (drill?.musteringDrill || 0) +
    (drill?.medievacDrill || 0) +
    (drill?.h2sDrill || 0) +
    (drill?.manOverboardDrill || 0) +
    (drill?.othersDrill || 0);

  markdown += `## 🚒 Drills\n`;
  markdown += `- **Drills Today:** ${todayDrills}\n`;

  if (drillSummary?.ytdDrill !== undefined) {
    markdown += `- **YTD Drills:** ${drillSummary.ytdDrill}\n`;
  }

  markdown += `\n`;

  // Permits section
  const permitToWork = values?.permitToWork?.[0] || {};
  const permitToWorkSummary = values?.permitToWorkSummary || {};
  const todayPermits =
    (permitToWork?.cwpL1 || 0) +
    (permitToWork?.cwpL2 || 0) +
    (permitToWork?.hwspL1 || 0) +
    (permitToWork?.hwspL2 || 0) +
    (permitToWork?.confinedSpace1 || 0) +
    (permitToWork?.isolationConfirmationCertificate || 0);

  markdown += `## 📜 Permits\n`;
  markdown += `- **Permits Today:** ${todayPermits}\n`;

  const permitsDetail = [
    { label: "CWP-L1", value: permitToWork?.cwpL1 },
    { label: "CWP-L2", value: permitToWork?.cwpL2 },
    { label: "HWSP-L1", value: permitToWork?.hwspL1 },
    { label: "HWSP-L2", value: permitToWork?.hwspL2 },
    { label: "Confined Space", value: permitToWork?.confinedSpace1 },
    {
      label: "Isolation Confirmation Certificate",
      value: permitToWork?.isolationConfirmationCertificate,
    },
  ].filter((item) => item.value !== undefined && item.value > 0);

  if (permitsDetail.length > 0) {
    permitsDetail.forEach((p) => {
      markdown += `  - ${p.label}: ${p.value}\n`;
    });
  }

  if (permitToWorkSummary?.ytdPtw !== undefined) {
    markdown += `- **YTD Permits:** ${permitToWorkSummary.ytdPtw}\n`;
  }

  markdown += `\n`;

  // Inspections section
  const inspection = values?.inspection?.[0] || {};
  const inspectionSummary = values?.inspectionSummary || {};

  markdown += `## 🔍 Inspections\n`;

  if (inspection?.todayInspection !== undefined) {
    markdown += `- **Inspections Today:** ${inspection.todayInspection}\n`;
  }

  // Findings
  const openFindings = inspection?.openFinding || 0;
  const closeFindings = inspection?.closeFinding || 0;
  const outstandingFindings = inspection?.outstandingFinding || 0;

  if (openFindings > 0 || closeFindings > 0 || outstandingFindings > 0) {
    markdown += `- **Findings:**\n`;

    if (openFindings > 0) {
      markdown += `  - **Open Findings:** ${openFindings}\n`;
    }

    if (closeFindings > 0) {
      markdown += `  - **Closed Findings:** ${closeFindings}\n`;
    }

    if (outstandingFindings > 0) {
      markdown += `  - **Outstanding Findings:** ${outstandingFindings}\n`;
    }

    // Specific findings details
    if (inspection?.followUp) {
      markdown += `  - **Follow Up:** ${inspection.followUp}\n`;
    }
  }

  if (inspectionSummary?.ytdInspection !== undefined) {
    markdown += `- **YTD Inspections:** ${inspectionSummary.ytdInspection}\n`;
  }

  markdown += `\n`;

  // SMART Card Observations section
  const smartCard = values?.smartCard || {};
  const totalObservations =
    (smartCard?.unsafeAction || 0) +
    (smartCard?.unsafeCondition || 0) +
    (smartCard?.nearMiss || 0) +
    (smartCard?.processSafety || 0);

  markdown += `## 💡 SMART Card Observations\n`;
  markdown += `- **Unsafe Actions Reported:** ${smartCard?.unsafeAction || 0}\n`;

  if (smartCard?.description) {
    markdown += `- **Observation:** ${smartCard.description}\n`;
  }

  return markdown;
};