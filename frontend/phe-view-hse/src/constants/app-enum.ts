export const USER_ROLE = {
  admin: {
    label: "Admin",
    value: "admin"
  },
  contractor: {
    label: "Contractor",
    value: "contractor"
  },
  user: {
    label: "User",
    value: "user"
  },
  crew: {
    label: "Crew",
    value: "crew"
  },
  evaluator: {
    label: "Evaluator",
    value: "evaluator"
  },
  verifikator: {
    label: "Verifikator",
    value: "verifikator"
  },
  manager: {
    label: "Manager",
    value: "manager"
  }
}

export const OrderbyOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

export const INSTANCE_TYPE = {
  "PHE OSES": { label: "PHE OSES", value: "PHE OSES" }, "Kontraktor": { label: "Kontraktor", value: "Kontraktor" }
}

export const SIKE_CERT_TYPE = {
  certificate: { label: "SIKA Certificate", value: "SIKA Certificate" },
  awareness: { label: "SIKA Awareness", value: "SIKA Awareness" }
}

export const REPORT_TYPE = {
  project: {
    label: "Project",
    value: "project"
  },
  marine: {
    label: "Marine",
    value: "marine"
  }
}

export const PROJECT_SUBTYPE = {
  GCU: {
    label: "GCU",
    value: "GCU"
  },
  TAR: {
    label: "TAR",
    value: "TAR"
  },
  Workshop: {
    label: "Workshop",
    value: "Workshop"
  },
  Other: {
    label: "Other",
    value: "Other"
  }
}

export const MEETING_TYPE = {
  toolbox: {
    value: "toolbox",
    label: "Toolbox Meeting"
  },
  generalSafety: {
    value: "generalSafety",
    label: "General Safety Meeting"
  },
  safetyCommittee: {
    value: "safetyCommittee",
    label: "Safety Committee Meeting"
  },
  preJob: {
    value: "preJob",
    label: "Pre Job Meeting"
  },
  monthlySafety: {
    value: "monthlySafety",
    label: "Monthly Safety Meeting"
  },
  hsseSiteOrientation: {
    value: "hsseSiteOrientation",
    label: "HSSE Site Orientation"
  },
  marineContractorMeeting: {
    value: "marineContractorMeeting",
    label: "Marine Contractor Meeting"
  },
  safetyStandDownMeeting: {
    value: "safetyStandDownMeeting",
    label: "Safety Stand Down Meeting"
  },
  marineSafetyCampaign: {
    value: "marineSafetyCampaign",
    label: "Marine Safety Campaign"
  },
  others: {
    value: "others",
    label: "Others Meeting"
  }
}
export const getMeetingTypeFrom = (type: string) => {
  if (type === "marine") {
    return (
      {
        toolbox: MEETING_TYPE.toolbox,
        generalSafety: MEETING_TYPE.generalSafety,
        preJob: MEETING_TYPE.preJob,
        hsseSiteOrientation: MEETING_TYPE.hsseSiteOrientation,
        marineContractorMeeting: MEETING_TYPE.marineContractorMeeting,
        safetyStandDownMeeting: MEETING_TYPE.safetyStandDownMeeting,
        marineSafetyCampaign: MEETING_TYPE.marineSafetyCampaign,
        others: MEETING_TYPE.others
      }
    )
  }
  return (
    {
      toolbox: MEETING_TYPE.toolbox,
      generalSafety: MEETING_TYPE.generalSafety,
      safetyCommittee: MEETING_TYPE.safetyCommittee,
      preJob: MEETING_TYPE.preJob,
      monthlySafety: MEETING_TYPE.monthlySafety,
      hsseSiteOrientation: MEETING_TYPE.hsseSiteOrientation,
    }
  )
}
export const DRILL_TYPE = {
  fireDrill: {
    value: "fireDrill",
    label: "Fire Drill"
  },
  abandonDrill: {
    value: "abandonDrill",
    label: "Abandon Drill"
  },
  musteringDrill: {
    value: "musteringDrill",
    label: "Mustering Drill"
  },
  medievacDrill: {
    value: "medievacDrill",
    label: "Medievac Drill"
  },
  h2sDrill: {
    value: "h2sDrill",
    label: "H2S Drill"
  },
  oilPollutionPreventionDrill: {
    value: "oilPollutionPreventionDrill",
    label: "Oil Pollution Prevention Drill"
  },
  steeringGearFailureDrill: {
    value: "steeringGearFailureDrill",
    label: "Steering Gear Failure Drill"
  },
  manOverboardDrill: {
    value: "manOverboardDrill",
    label: "Man Overboard Drill"
  },
  groundingDrill: {
    value: "groundingDrill",
    label: "Grounding Drill"
  },
  firstAidDrill: {
    value: "firstAidDrill",
    label: "First Aid Drill"
  },
  collisionDrill: {
    value: "collisionDrill",
    label: "Collision Drill"
  },
  dryDrill: {
    value: "dryDrill",
    label: "Dry Drill"
  },
  wetDrill: {
    value: "wetDrill",
    label: "Wet Drill"
  },
  othersDrill: {
    value: "othersDrill",
    label: "Others Drill"
  }
}

export const getDrillTypeFrom = (type: string) => {
  if (type === "marine") {
    const { musteringDrill, dryDrill, h2sDrill, wetDrill, ...filteredDrills } = DRILL_TYPE;
    return filteredDrills;
  }
  return DRILL_TYPE;
}

export const TRAINING_TYPE = {
  clsr: {
    value: "clsr",
    label: "CLSR"
  },
  akhlak: {
    value: "akhlak",
    label: "Akhlak"
  },
  unsafeActionCategory: {
    value: "unsafeActionCategory",
    label: "Unsafe Action Category"
  },
  sika: {
    value: "sika",
    label: "SIKA"
  },
  l2ra: {
    value: "l2ra",
    label: "L2RA"
  },
  preSiteInduction: {
    value: "preSiteInduction",
    label: "Pre-Site Induction"
  },
  siteInduction: {
    value: "siteInduction",
    label: "Site Induction"
  },
  shipboardTraining: {
    value: "shipboardTraining",
    label: "Shipboard Training"
  },
  othersTraining: {
    value: "othersTraining",
    label: "Others Training"
  }
}

export const getTrainingTypeFrom = (type: string) => {
  if (type === "marine") {
    return ({
      sika: TRAINING_TYPE.sika,
      shipboardTraining: TRAINING_TYPE.shipboardTraining
    })
  }
  return TRAINING_TYPE;
}

export const INSPECTION_TYPE = {
  openFinding: {
    value: "openFinding",
    label: "Open Findings"
  },
  closeFinding: {
    value: "closeFinding",
    label: "Closed Findings"
  },
  // outstandingFinding: {
  //   value: "outstandingFinding",
  //   label: "Outstanding Findings"
  // },
  // noIssue: {
  //   value: "noIssue",
  //   label: "No Issues"
  // },
}

export const INSPECTION_MARINE_TYPE = {
  lsaInspection: {
    value: "lsaInspection",
    label: "LSA Inspection"
  },
  ffaInspection: {
    value: "ffaInspection",
    label: "FFA Inspection"
  },
  ppeInspection: {
    value: "ppeInspection",
    label: "PPE Inspection"
  },
  otherInspection: {
    value: "otherInspection",
    label: "Other Inspection"
  }
}

export const PERMIT_TO_WORK_TYPE = {
  generalWork: {
    value: "generalWork",
    label: "General Work",
    color: "#0066CC"
  },
  criticalWork: {
    value: "criticalWork",
    label: "Critical Work",
    color: "#FFCC00"
  },
  hotWork: {
    value: "hotWork",
    label: "Hot Work",
    color: "#CC0000"
  },
  breakingContainment: {
    value: "breakingContainment",
    label: "Breaking Containment",
    color: "#000000"
  },
  confinedSpace: {
    value: "confinedSpace",
    label: "Confined Space",
    color: "#009900"
  },
  isolationConfirmationCertificate: {
    value: "isolationConfirmationCertificate",
    label: "Isolation",
    color: "#663300"
  }
}

export const RISK_ASSESSMENT_STATUS = {
  "not started": {
    value: "not started",
    label: "Not Started",
    color: "text-red-500"
  },
  done: {
    value: "done",
    label: "Done",
    color: "text-green-500"
  },
  incomplete: {
    value: "incomplete",
    label: "Incomplete",
    color: "text-orange-500"
  },
  verified: {
    value: "verified",
    label: "Verified",
    color: "text-blue-500"
  }
}

export const QUALIFICATION_ASSESSMENT_TYPE = {
  massal: {
    value: "massal",
    label: "Penilaian Kualifikasi Massal",
    color: "text-red-500"
  },
  tender: {
    value: "tender",
    label: "Penilaian Kualifikasi Tender",
    color: "text-green-500"
  },
}

export const QUALIFICATION_ASSESSMENT_STATUS = {
  "not started": {
    value: "not started",
    label: "Not Started",
    color: "text-red-500"
  },
  done: {
    value: "done",
    label: "Done",
    color: "text-green-500"
  },
  incomplete: {
    value: "incomplete",
    label: "Incomplete",
    color: "text-orange-500"
  },
}

export const EMPLOYEE_TYPE = {
  project: {
    value: "project",
    label: "Project",
    styles: "bg-orange-500"
  },
  marine: {
    value: "marine",
    label: "Marine",
    styles: "bg-purple-500"
  },
  mitra: {
    value: "mitra",
    label: "Mitra",
    styles: "bg-blue-500"
  }
}

export const EMPLOYEE_FILE_TYPE = {
  bpjs: {
    value: "bpjs",
    label: "BPJS",
    color: "bg-green-500"
  },
  contract: {
    value: "contract",
    label: "Contract",
    color: "bg-blue-500"
  },
  vaccine: {
    value: "vaccine",
    label: "Vaccine",
    color: "bg-red-500"
  },
  mcu: {
    value: "mcu",
    label: "MCU",
    color: "bg-yellow-500"
  },
  sika: {
    value: "sika",
    label: "SIKA",
    color: "bg-gray-500"
  },
  certificate: {
    value: "certificate",
    label: "Certificate",
    color: "bg-pink-500"
  }
}

export const EMPLOYEE_RANK_COMPLIANCE_DOC = {
  BPJS: {
    value: "BPJS",
    label: "BPJS",
    color: "bg-green-500"
  },
  Contract: {
    value: "Contract",
    label: "Contract",
    color: "bg-blue-500"
  },
  Vaccine: {
    value: "Vaccine",
    label: "Vaccine",
    color: "bg-red-500"
  },
  SIKA: {
    value: "SIKA",
    label: "SIKA",
    color: "bg-gray-500"
  },
  MCU: {
    value: "MCU",
    label: "MCU",
    color: "bg-yellow-500"
  },
  BSS: {
    value: "BSS",
    label: "BSS",
    color: "bg-gray-500"
  },
  BST: {
    value: "BST",
    label: "BST",
    color: "bg-gray-500"
  },
  "Competency Certificate": {
    value: "Competency Certificate",
    label: "Certificate",
    color: "bg-pink-500"
  }
}

export const RANK_HEALTH_OH_IH = {
  P1: {
    value: "P1",
    label: "P1",
    color: "bg-red-500"
  },
  P2: {
    value: "P2",
    label: "P2",
    color: "bg-red-500"
  },
  P3: {
    value: "P3",
    label: "P3",
    color: "bg-yellow-500"
  },
  P4: {
    value: "P4",
    label: "P4",
    color: "bg-yellow-500"
  },
  P5: {
    value: "P5",
    label: "P5",
    color: "bg-yellow-500"
  },
  P6: {
    value: "P6",
    label: "P6",
    color: "bg-green-500"
  },
  P7: {
    value: "P7",
    label: "P7",
    color: "bg-green-500"
  },
}

export const RANK_HEALTH_TYPE = {
  status: {
    value: "status",
    label: "Status",
    // color: "bg-gray-500"
  },
  followup: {
    value: "followup",
    label: "Follow Up",
    // color: "bg-gray-500"
  },
}

export const BPJS_TYPE = {
  ketenagakerjaan: { value: "BPJS Ketenagakerjaan", label: "BPJS Ketenagakerjaan" },
  kesehatan: { value: "BPJS Kesehatan", label: "BPJS Kesehatan" },
}
export const getInspectionType = (obj: Record<string, any>) => {
  for (const key in INSPECTION_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof INSPECTION_TYPE;
      if (obj[key] === 1) {
        return INSPECTION_TYPE[typedKey].label;
      }
    }
  }
  return ("");
}

export const getSelectedInspection = (obj: Record<string, any>) => {
  for (const key in INSPECTION_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof INSPECTION_TYPE;
      if (obj[key] === 1) {
        return INSPECTION_TYPE[typedKey].value;
      }
    }
  }
  return ("");
}

export const getInspectionMarineType = (obj: Record<string, any>) => {
  for (const key in INSPECTION_MARINE_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof INSPECTION_MARINE_TYPE;
      if (obj[key] === 1) {
        return INSPECTION_MARINE_TYPE[typedKey].label;
      }
    }
  }
  return ("");
}

export const getSelectedInspectionMarine = (obj: Record<string, any>) => {
  for (const key in INSPECTION_MARINE_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof INSPECTION_MARINE_TYPE;
      if (obj[key] === 1) {
        return INSPECTION_MARINE_TYPE[typedKey].value;
      }
    }
  }
  return ("");
}

export const getMeetingType = (obj: Record<string, any>) => {
  for (const key in MEETING_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof MEETING_TYPE;
      if (obj[key] === 1) {
        return MEETING_TYPE[typedKey].label;
      }
    }
  }
  return ("");
}

export const getSelectedMeeting = (obj: Record<string, any>) => {
  for (const key in MEETING_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof MEETING_TYPE;
      if (obj[key] === 1) {
        return MEETING_TYPE[typedKey].value;
      }
    }
  }
  return ("");
}

export const getDrillType = (obj: Record<string, any>) => {
  for (const key in DRILL_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof DRILL_TYPE;
      if (obj[key] === 1) {
        return DRILL_TYPE[typedKey].label;
      }
    }
  }
  return ("");
}

export const getSelectedDrill = (obj: Record<string, any>) => {
  for (const key in DRILL_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof DRILL_TYPE;
      if (obj[key] === 1) {
        return DRILL_TYPE[typedKey].value;
      }
    }
  }
  return ("");
}

export const getTrainingType = (obj: Record<string, any>) => {
  for (const key in TRAINING_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof TRAINING_TYPE;
      if (obj[key] === 1) {
        return TRAINING_TYPE[typedKey].label;
      }
    }
  }
  return ("");
}

export const getSelectedTraining = (obj: Record<string, any>) => {
  for (const key in TRAINING_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof TRAINING_TYPE;
      if (obj[key] === 1) {
        return TRAINING_TYPE[typedKey].value;
      }
    }
  }
  return ("");
}

export const getPermitToWorkType = (obj: Record<string, any>) => {
  for (const key in PERMIT_TO_WORK_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof PERMIT_TO_WORK_TYPE;
      if (obj[key] === 1) {
        return PERMIT_TO_WORK_TYPE[typedKey].label;
      }
    }
  }
  return ("");
}

export const getSelectedPermitToWork = (obj: Record<string, any>) => {
  for (const key in PERMIT_TO_WORK_TYPE) {
    if (key in obj) {
      const typedKey = key as keyof typeof PERMIT_TO_WORK_TYPE;
      if (obj[key] === 1) {
        return PERMIT_TO_WORK_TYPE[typedKey].value;
      }
    }
  }
  return ("");
}

export const getRiskAssessmentStatus = (key: string) => {
  const typedKey = key as keyof typeof RISK_ASSESSMENT_STATUS;
  if (key in RISK_ASSESSMENT_STATUS) {
    return RISK_ASSESSMENT_STATUS[typedKey];
  }
  return ({ color: "text-foreground" });
}

export const getEmployeeColor = (key: string) => {
  const typedKey = key as keyof typeof EMPLOYEE_TYPE;
  if (key in EMPLOYEE_TYPE) {
    return EMPLOYEE_TYPE[typedKey].styles;
  }
  return ("bg-gray-500");
}

export const getEmployeeLabel = (key: string) => {
  const typedKey = key as keyof typeof EMPLOYEE_TYPE;
  if (key in EMPLOYEE_TYPE) {
    return EMPLOYEE_TYPE[typedKey].label;
  }
  return ("");
}

export const NotificationStatusColors = {
  expired: "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800",
  active: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800",
  warning: "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
};

export const NotificationStatusItem = {
  expired: "bg-red-700 dark:bg-red-950/30 border border-red-300",
  active: "bg-green-700 dark:bg-green-950/30 border border-green-300",
  warning: "bg-yellow-700 dark:bg-yellow-950/30 border border-yellow-300"
};

export const CertificateTypeColors = {
  sika: "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  safety: "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800",
  maintenance: "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
  general: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
}