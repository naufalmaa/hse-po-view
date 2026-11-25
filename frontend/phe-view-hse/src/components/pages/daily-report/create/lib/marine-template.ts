import {z} from "zod"
import {TabListReportProps, borderColors} from "./constants";
import {
  DRILL_TYPE,
  getMeetingTypeFrom,
  INSPECTION_MARINE_TYPE,
  INSPECTION_TYPE,
  PERMIT_TO_WORK_TYPE,
  TRAINING_TYPE
} from "@/constants/app-enum";

export const tabListMarineReport: TabListReportProps = {
  identity: {
    value: "identity",
    label: "Identitas",
    desc: "Daily report identity",
  },
  laggingIndicator: {
    value: "laggingIndicator",
    label: "Lagging Indicator",
    desc: "Daily report lagging indicator",
  },
  manHours: {
    value: "manHours",
    label: "Manhours",
    desc: "Daily report manhours",
  },
  meeting: {
    value: "meeting",
    label: "Meeting Events",
    desc: "Daily report meeting events",
  },
  drill: {
    value: "drill",
    label: "Drill Events",
    desc: "Daily report drill events",
  },
  training: {
    value: "training",
    label: "Training Events",
    desc: "Daily report training events",
  },
  inspection: {
    value: "inspection",
    label: "Inspection",
    desc: "Daily report inspection",
  },
  permitToWork: {
    value: "permitToWork",
    label: "Permit To Work",
    desc: "Daily report permit to work",
  },
  smartCard: {
    value: "smartCard",
    label: "Kartu Pintar",
    desc: "Daily report kartu pintar",
  },
  operation: {
    value: "operation",
    label: "Operation",
    desc: "Daily report operation",
  },
  // vesselUnderPnO: {
  //   value: "vesselUnderPnO",
  //   label: "Vessel Under P&O",
  //   desc: "Daily report vessel under P&O",
  // },
  uploadFile: {
    value: "uploadFile",
    label: "Supporting Files",
    desc: "Daily report supporting files",
  },
}

export const marineFormList = {
  laggingIndicator: {
    form: {
      info: {
        title: "Lagging Indicator"
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Lagging Indicator Description",
        shortLabel: "Lagging Indicator",
        placeholder: "",
        border: borderColors[0]
      },
      statusFreeLtaRi: {
        type: "switch",
        name: "statusFreeLtaRi",
        label: "Free LTA/RI",
        shortLabel: "Free LTA/RI",
        placeholder: "",
        border: borderColors[0],
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]
      },
      freeLtaDays: {
        type: "number",
        name: "freeLtaDays",
        label: "Free LTA (days)",
        shortLabel: "Free LTA",
        placeholder: "",
        border: borderColors[0]
      },
      freeRiDays: {
        type: "number",
        name: "freeRiDays",
        label: "Free RI (days)",
        shortLabel: "Free RI",
        placeholder: "",
        border: borderColors[0]
      },
      fatality: {
        type: "number",
        name: "fatality",
        label: "Fatality",
        shortLabel: "Fatal",
        placeholder: "",
        border: borderColors[0]
      },
      lti: {
        type: "number",
        name: "lti",
        label: "LTI",
        shortLabel: "LTI",
        placeholder: "",
        border: borderColors[0]
      },
      restrictedWorkDayCase: {
        type: "number",
        name: "restrictedWorkDayCase",
        label: "Restricted Work Day Case",
        shortLabel: "RWDC",
        placeholder: "",
        border: borderColors[0]
      },
      medicalTreatmentCase: {
        type: "number",
        name: "medicalTreatmentCase",
        label: "Medical Treatment Case",
        shortLabel: "MTC",
        placeholder: "",
        border: borderColors[0]
      },
      firstAid: {
        type: "number",
        name: "firstAid",
        label: "First Aid",
        shortLabel: "FA",
        placeholder: "",
        border: borderColors[0]
      },
      nearMiss: {
        type: "number",
        name: "nearMiss",
        label: "Near Miss",
        shortLabel: "NM",
        placeholder: "",
        border: borderColors[0]
      },
      unsafeAction: {
        type: "number",
        name: "unsafeAction",
        label: "Unsafe Action",
        shortLabel: "UA",
        placeholder: "",
        border: borderColors[0]
      },
      unsafeCondition: {
        type: "number",
        name: "unsafeCondition",
        label: "Unsafe Condition",
        shortLabel: "UC",
        placeholder: "",
        border: borderColors[0]
      },
      environmentalDamage: {
        type: "number",
        name: "environmentalDamage",
        label: "Environmental Damage",
        shortLabel: "ED",
        placeholder: "",
        border: borderColors[0]
      },
      propertyDamage: {
        type: "number",
        name: "propertyDamage",
        label: "Property Damage",
        shortLabel: "PD",
        placeholder: "",
        border: borderColors[0]
      },
      recordableIncident: {
        type: "number",
        name: "recordableIncident",
        label: "Recordable Incident",
        shortLabel: "RI",
        placeholder: "",
        border: borderColors[0]
      },
      nonRecordableIncident: {
        type: "number",
        name: "nonRecordableIncident",
        label: "Non Recordable Incident",
        shortLabel: "NRI",
        placeholder: "",
        border: borderColors[0]
      }
    },
    schema: {
      description: z.string(),
      statusFreeLtaRi: z.boolean(),
      freeLtaDays: z.number().min(0, {message: "Please enter freeLtaDays"}),
      freeRiDays: z.number().min(0, {message: "Please enter freeRiDays"}),
      fatality: z.number().min(0, {message: "Please enter fatality"}),
      lti: z.number().min(0, {message: "Please enter lti"}),
      restrictedWorkDayCase: z.number().min(0, {message: "Please enter restricted work day case"}),
      medicalTreatmentCase: z.number().min(0, {message: "Please enter medical treatment case"}),
      firstAid: z.number().min(0, {message: "Please enter first aid"}),
      nearMiss: z.number().min(0, {message: "Please enter near miss"}),
      unsafeAction: z.number().min(0, {message: "Please enter unsafe action"}),
      unsafeCondition: z.number().min(0, {message: "Please enter unsafe condition"}),
      environmentalDamage: z.number().min(0, {message: "Please enter environmental damage"}),
      propertyDamage: z.number().min(0, {message: "Please enter property damage"}),
      recordableIncident: z.number().min(0, {message: "Please enter recordable incident"}),
      nonRecordableIncident: z.number().min(0, {message: "Please enter non recordable incident"}),
    },
    defaultValue: {
      description: "",
      statusFreeLtaRi: true,
      freeLtaDays: 0,
      freeRiDays: 0,
      fatality: 0,
      lti: 0,
      restrictedWorkDayCase: 0,
      medicalTreatmentCase: 0,
      firstAid: 0,
      nearMiss: 0,
      unsafeAction: 0,
      unsafeCondition: 0,
      environmentalDamage: 0,
      propertyDamage: 0,
      recordableIncident: 0,
      nonRecordableIncident: 0,
    }
  },
  manHours: {
    form: {
      info: {
        title: "Manhours"
      },
      pobPheOses: {
        type: "number",
        name: "pobPheOses",
        label: "POB PHE OSES",
        shortLabel: "POB PHE OSES",
        placeholder: "",
        border: borderColors[0]
      },
      pobContractor: {
        type: "number",
        name: "pobContractor",
        label: "POB Contractor",
        shortLabel: "POB Contractor",
        placeholder: "",
        border: borderColors[0]
      },
      hoursPobPheOses: {
        type: "number",
        name: "hoursPobPheOses",
        label: "Hours per Day PHE OSES",
        shortLabel: "Daily Mandays",
        placeholder: "",
        border: borderColors[1]
      },
      hoursPobContractor: {
        type: "number",
        name: "hoursPobContractor",
        label: "Hours per Day Contractor",
        shortLabel: "Daily Mandays",
        placeholder: "",
        border: borderColors[1]
      },
      dailyMandays: {
        type: "number",
        name: "dailyMandays",
        label: "Daily Mandays",
        shortLabel: "Daily Mandays",
        placeholder: "",
        border: borderColors[1]
      },
      monthlyMandays: {
        type: "number",
        name: "monthlyMandays",
        label: "Monthly Mandays",
        shortLabel: "Monthly Mandays",
        placeholder: "",
        border: borderColors[1]
      },
      ytdMandays: {
        type: "number",
        name: "ytdMandays",
        label: "YTD Mandays",
        shortLabel: "YTD Mandays",
        placeholder: "",
        border: borderColors[1]
      },
      todayManhours: {
        type: "number",
        name: "todayManhours",
        label: "Today Manhours",
        shortLabel: "Today Manhours",
        placeholder: "",
        border: borderColors[1]
      },
      monthlyManhours: {
        type: "number",
        name: "monthlyManhours",
        label: "Monthly Manhours",
        shortLabel: "Monthly Manhours",
        placeholder: "",
        border: borderColors[1]
      },
      ytdManhours: {
        type: "number",
        name: "ytdManhours",
        label: "YTD Manhours",
        shortLabel: "YTD Manhours",
        placeholder: "",
        border: borderColors[1]
      }
    },
    schema: {
      pobPheOses: z.number().min(0, {message: "Please enter pob phe oses"}),
      pobContractor: z.number().min(0, {message: "Please enter pob contractor"}),
      // dailyMandays: z.number().min(0, {message: "Please enter daily mandays"}),
      // monthlyMandays: z.number().min(0, {message: "Please enter monthly mandays"}),
      // ytdMandays: z.number().min(0, {message: "Please enter ytd mandays"}),
      // todayManhours: z.number().min(0, {message: "Please enter today manhours"}),
      // monthlyManhours: z.number().min(0, {message: "Please enter monthly manhours"}),
      // ytdManhours: z.number().min(0, {message: "Please enter ytd manhours"}),
      hoursPobPheOses: z.number().min(0, {message: "Please enter hours pob phe oses"}),
      hoursPobContractor: z.number().min(0, {message: "Please enter hours pob contractor"})
    },
    defaultValue: {
      pobPheOses: 0,
      pobContractor: 0,
      dailyMandays: 0,
      monthlyMandays: 0,
      ytdMandays: 0,
      todayManhours: 0,
      monthlyManhours: 0,
      ytdManhours: 0,
      hoursPobPheOses: 0,
      hoursPobContractor: 0
    }
  },
  meeting: {
    form: {
      info: {
        title: "Meeting"
      },
      status: {
        type: "select",
        name: "status",
        label: "Jenis Meeting",
        shortLabel: "Jenis Meeting",
        placeholder: "",
        options: Object.values(getMeetingTypeFrom("marine")),
        border: borderColors[0]
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Meeting Agenda",
        shortLabel: "Highlight Meeting",
        placeholder: "",
        border: borderColors[0]
      },
      absencePercentage: {
        type: "number",
        name: "absencePercentage",
        label: "Total Participant",
        shortLabel: "Absense",
        placeholder: "",
        border: borderColors[0]
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: "Evidence",
        shortLabel: "Evidence",
        placeholder: "",
        border: borderColors[1],
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024
      },
    },
    schema: {
      status: z.string().min(1, {message: "Please enter jenis meeting"}),
      description: z.string().min(1, {message: "Please enter meeting description"}),
      absencePercentage: z.number().min(0, {message: "Please enter valid total participant"}),
      evidence: z.array(z.any()),
    },
    defaultValue: {
      status: "",
      description: "",
      absencePercentage: 0,
      evidence: [],
    }
  },
  drill: {
    form: {
      info: {
        title: "Drill",
      },
      status: {
        type: "select",
        name: "status",
        label: "Jenis Drill",
        shortLabel: "Jenis Drill",
        placeholder: "",
        options: Object.values(DRILL_TYPE),
        border: borderColors[0]
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Drill Description",
        shortLabel: "Highlight Drill",
        placeholder: "",
        border: borderColors[0]
      },
      totalParticipants: {
        type: "number",
        name: "totalParticipants",
        label: "Total Participant",
        shortLabel: "Total Participant",
        placeholder: "",
        border: borderColors[0]
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: "Evidence",
        shortLabel: "Evidence",
        placeholder: "",
        border: borderColors[1],
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024
      },
    },
    schema: {
      status: z.string().min(1, {message: "Please enter drill status"}),
      description: z.string().min(1, {message: "Please enter drill description"}),
      totalParticipants: z.number().min(0, {message: "Please enter total participant"}),
      evidence: z.array(z.any()),
    },
    defaultValue: {
      status: "",
      description: "",
      totalParticipants: 0,
      evidence: [],
    }
  },
  training: {
    form: {
      info: {
        title: "Training"
      },
      status: {
        type: "select",
        name: "status",
        label: "Training Status",
        shortLabel: "Training Status",
        placeholder: "",
        options: Object.values(TRAINING_TYPE),
        border: borderColors[0]
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Training Description",
        shortLabel: "Highlight Training",
        placeholder: "",
        border: borderColors[0]
      },
      totalParticipants: {
        type: "number",
        name: "totalParticipants",
        label: "Total Participant",
        shortLabel: "Total Participant",
        placeholder: "",
        border: borderColors[0]
      },
      sika: {
        type: "number",
        name: "sika",
        label: "SIKA Training",
        shortLabel: "SIKA Training",
        placeholder: "",
        border: borderColors[0]
      },
      shipboardTraining: {
        type: "number",
        name: "shipboardTraining",
        label: "Shipboard Training",
        shortLabel: "Shipboard",
        placeholder: "",
        border: borderColors[0]
      },
      othersTraining: {
        type: "number",
        name: "othersTraining",
        label: "Other Training",
        shortLabel: "Others",
        placeholder: "",
        border: borderColors[0]
      },
      todayTraining: {
        type: "number",
        name: "todayTraining",
        label: "Today Training",
        shortLabel: "Today Training",
        placeholder: "",
        border: borderColors[1]
      },
      monthlyTraining: {
        type: "number",
        name: "monthlyTraining",
        label: "Monthly Training",
        shortLabel: "Monthly Training",
        placeholder: "",
        border: borderColors[1]
      },
      ytdTraining: {
        type: "number",
        name: "ytdTraining",
        label: "YTD Training",
        shortLabel: "YTD Training",
        placeholder: "",
        border: borderColors[1]
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: "Evidence",
        shortLabel: "Evidence",
        placeholder: "",
        border: borderColors[1],
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024
      }
    },
    schema: {
      status: z.string().min(1, {message: "Please enter training status"}),
      description: z.string().min(1, {message: "Please enter training description"}),
      totalParticipants: z.number().min(0, {message: "Please enter total participant"}),
      evidence: z.array(z.any()),
      // sika: z.number().min(0, {message: "Please enter SIKA"}),
      // shipboardTraining: z.number().min(0, {message: "Please enter shipboard training"}),
      // othersTraining: z.number().min(0, {message: "Please enter others training"}),
    },
    defaultValue: {
      status: "",
      description: "",
      totalParticipants: 0,
      evidence: [],
      sika: 0,
      shipboardTraining: 0,
      othersTraining: 0,
    }
  },
  inspection: {
    form: {
      info: {
        title: "Inspection"
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Description",
        shortLabel: "Highlight Inspection",
        placeholder: "",
        border: borderColors[0]
      },
      openFinding: {
        type: "number",
        name: "openFinding",
        label: "Open Findings",
        shortLabel: "Open Finding",
        placeholder: "",
        border: borderColors[0]
      },
      closeFinding: {
        type: "number",
        name: "closeFinding",
        label: "Closed Findings",
        shortLabel: "Closed Finding",
        placeholder: "",
        border: borderColors[0]
      },
      inspection: {
        type: "number",
        name: "inspection",
        label: "Inspection",
        shortLabel: "Inspection",
        placeholder: "",
        border: borderColors[0]
      },
      unsafeCondition: {
        type: "number",
        name: "unsafeCondition",
        label: "Unsafe Condition",
        shortLabel: "Unsafe Condition",
        placeholder: "",
        border: borderColors[0]
      },
      todayInspection: {
        type: "number",
        name: "todayInspection",
        label: "Today Inspection",
        shortLabel: "Today Inspection",
        placeholder: "",
        border: borderColors[1]
      },
      monthlyInspection: {
        type: "number",
        name: "monthlyInspection",
        label: "Monthly Inspection",
        shortLabel: "Monthly Inspection",
        placeholder: "",
        border: borderColors[1]
      },
      ytdInspection: {
        type: "number",
        name: "ytdInspection",
        label: "YTD Inspection",
        shortLabel: "YTD Inspection",
        placeholder: "",
        border: borderColors[1]
      },
      finding: {
        type: "text",
        name: "finding",
        label: "Finding",
        shortLabel: "Temuan",
        placeholder: "",
        border: borderColors[1]
      },
      status: {
        type: "select",
        name: "status",
        label: "Inspection Status",
        shortLabel: "Status",
        placeholder: "",
        border: borderColors[1],
        options: Object.values(INSPECTION_TYPE)
      },
      followUp : {
        type: "text",
        name: "followUp",
        label: "Follow Up",
        shortLabel: "Follow Up",
        placeholder: "",
        border: borderColors[1]
      },
      deadline: {
        type: "date",
        name: "deadline",
        label: "Deadline",
        shortLabel: "Deadline",
        placeholder: "",
        border: borderColors[1]
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: "Evidence",
        shortLabel: "Evidence",
        placeholder: "",
        border: borderColors[1],
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024
      }
    },
    schema: {
      finding: z.string().min(1, {message: "Please enter finding"}),
      status: z.string().min(1, {message: "Please enter status"}),
      description: z.string().min(0, {message: "Please enter description"}),
      followUp: z.string().min(0, {message: "Please enter follow up"}),
      deadline: z.date().optional(),
      evidence: z.array(z.any()),
      // inspection: z.number().min(0, {message: "Please enter inspection"}),
      // openFinding: z.number().min(0, {message: "Please enter open findings"}),
      // closeFinding: z.number().min(0, {message: "Please enter closed findings"}),
      // inspection: z.number().min(0, {message: "Please enter inspection"}),
      // unsafeCondition: z.number().min(0, {message: "Please enter unsafe condition"}),
    },
    defaultValue: {
      finding: "",
      status: "",
      description: "",
      followUp: "",
      deadline: new Date(),
      openFinding: 0,
      closeFinding: 10,
      inspection: 0,
      unsafeCondition: 0,
      evidence: [],
    }
  },
  inspectionMarine: {
    form: {
      info: {
        title: "Inspection"
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Description",
        shortLabel: "Highlight Inspection",
        placeholder: "",
        border: borderColors[0]
      },
      status: {
        type: "select",
        name: "status",
        label: "Inspection Status",
        shortLabel: "Status",
        placeholder: "",
        border: borderColors[1],
        options: Object.values(INSPECTION_MARINE_TYPE)
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: "Evidence",
        shortLabel: "Evidence",
        placeholder: "",
        border: borderColors[1],
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024
      }
    },
    schema: {
      status: z.string().min(1, {message: "Please enter status"}),
      description: z.string().min(0, {message: "Please enter description"}),
      evidence: z.array(z.any()),
    },
    defaultValue: {
      status: "",
      description: "",
      evidence: [],
    }
  },
  permitToWork: {
    form: {
      info: {
        title: "Permit To Work"
      },
      status: {
        type: "select",
        name: "status",
        label: "Permit To Work Status",
        shortLabel: "Status",
        placeholder: "",
        border: borderColors[0],
        options: Object.values(PERMIT_TO_WORK_TYPE)
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Permit To Work Description",
        shortLabel: "Highlight Permit To Work",
        placeholder: "",
        border: borderColors[0]
      },
      expiryDate: {
        type: "date",
        name: "expiryDate",
        label: "Expired Date",
        shortLabel: "Expired Date",
        placeholder: "",
        border: borderColors[0]
      },
      cwpL1: {
        type: "number",
        name: "cwpL1",
        label: "CWP-L1",
        shortLabel: "Cold Work",
        placeholder: "",
        border: borderColors[0]
      },
      hwspL1: {
        type: "number",
        name: "hwspL1",
        label: "HWSP-L1",
        shortLabel: "Hot Work",
        placeholder: "",
        border: borderColors[0]
      },
      confinedSpace1: {
        type: "number",
        name: "confinedSpace1",
        label: "Confined Space 1",
        shortLabel: "Confined Space",
        placeholder: "",
        border: borderColors[0]
      },
      cwpL2: {
        type: "number",
        name: "cwpL2",
        label: "CWP-L2",
        shortLabel: "CWP-L2",
        placeholder: "",
        border: borderColors[0]
      },
      hwspL2: {
        type: "number",
        name: "hwspL2",
        label: "HWSP-L2",
        shortLabel: "HWSP-L2",
        placeholder: "",
        border: borderColors[0]
      },
      confinedSpace2: {
        type: "number",
        name: "confinedSpace2",
        label: "Confined Space 2",
        shortLabel: "Confined Space 2",
        placeholder: "",
        border: borderColors[0]
      },
      todayPtw: {
        type: "number",
        name: "todayPtw",
        label: "Today Permit To Work",
        shortLabel: "Daily PTW",
        placeholder: "",
        border: borderColors[1]
      },
      monthlyPtw: {
        type: "number",
        name: "monthlyPtw",
        label: "Monthly Permit To Work",
        shortLabel: "Monthly PTW",
        placeholder: "",
        border: borderColors[1]
      },
      ytdPtw: {
        type: "number",
        name: "ytdPtw",
        label: "YTD Permit To Work",
        shortLabel: "Daily PTW",
        placeholder: "",
        border: borderColors[1]
      },
      evidence: {
        type: "upload",
        name: "evidence",
        label: "Evidence",
        shortLabel: "Evidence",
        placeholder: "",
        border: borderColors[1],
        maxFiles: 25,
        maxSize: 100 * 1024 * 1024,
        totalMaxSize: 100 * 1024 * 1024
      }
    },
    schema: {
      status: z.string().min(1, {message: "Please enter status"}),
      description: z.string().min(1, {message: "Please enter description"}),
      deadline: z.date().optional(),
      evidence: z.array(z.any()),
      // cwpL1: z.number().min(0, {message: "Please enter cwp l1"}),
      // hwspL1: z.number().min(0, {message: "Please enter hwsp l1"}),
      // confinedSpace1: z.number().min(0, {message: "Please enter confined space 1"}),
      // cwpL2: z.number().min(0, {message: "Please enter cwp l2"}),
      // hwspL2: z.number().min(0, {message: "Please enter hwsp l2"}),
      // confinedSpace2: z.number().min(0, {message: "Please enter confined space 2"}),
    },
    defaultValue: {
      status: "",
      description: "",
      expiryDate: new Date(),
      evidence: [],
      cwpL1: 0,
      hwspL1: 0,
      confinedSpace1: 0,
      cwpL2: 0,
      hwspL2: 0,
      confinedSpace2: 0,
    }
  },
  smartCard: {
    form: {
      info: {
        title: "Kartu Pintar"
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Kartu Pintar Description",
        shortLabel: "Highlight Kartu Pintar",
        placeholder: "",
        border: borderColors[0]
      },
      unsafeAction: {
        type: "number",
        name: "unsafeAction",
        label: "Unsafe Action",
        shortLabel: "UA",
        placeholder: "",
        border: borderColors[0]
      },
      unsafeCondition: {
        type: "number",
        name: "unsafeCondition",
        label: "Unsafe Condition",
        shortLabel: "UC",
        placeholder: "",
        border: borderColors[0]
      },
      nearMiss: {
        type: "number",
        name: "nearMiss",
        label: "Near Miss",
        shortLabel: "NM",
        placeholder: "",
        border: borderColors[0]
      },
      processSafety: {
        type: "number",
        name: "processSafety",
        label: "Process Safety",
        shortLabel: "PS",
        placeholder: "",
        border: borderColors[0]
      },
      todayParticipationRate: {
        type: "number",
        name: "todayParticipationRate",
        label: "Today's Participation Rate",
        shortLabel: "Today Participation (%)",
        placeholder: "",
        border: borderColors[1]
      },
      monthlyParticipationRate: {
        type: "number",
        name: "monthlyParticipationRate",
        label: "Monthly Participation Rate",
        shortLabel: "Monthly Participation (%)",
        placeholder: "",
        border: borderColors[1]
      },
      ytdParticipationRate: {
        type: "number",
        name: "ytdParticipationRate",
        label: "YTD Participation Rate",
        shortLabel: "YTD Participation (%)",
        placeholder: "",
        border: borderColors[1]
      },
      todayParticipate: {
        type: "number",
        name: "todayParticipate",
        label: "Today's Participate",
        shortLabel: "Today Participate",
        placeholder: "",
      },
      todayParticipateRate: {
        type: "number",
        name: "todayParticipateRate",
        label: "Today's Participate Rate",
        shortLabel: "Today Participate Rate",
        placeholder: "",
      },
      monthlyParticipate: {
        type: "number",
        name: "monthlyParticipate",
        label: "Monthly Participate",
        shortLabel: "Monthly Participate",
        placeholder: "",
      },
      ytdParticipate: {
        type: "number",
        name: "ytdParticipate",
        label: "YTD Participate",
        shortLabel: "YTD Participate",
        placeholder: "",
      },
      nonParticipants: {
        type: "text",
        name: "nonParticipants",
        label: "Pekerja Yang Tidak Input Kartu Pintar",
        shortLabel: "Pekerja Yang Tidak Input Kartu Pintar",
        placeholder: "",
      }
    },
    schema: {
      description: z.string(),
      unsafeAction: z.number().min(0, {message: "Please enter unsafe action"}),
      unsafeCondition: z.number().min(0, {message: "Please enter unsafe condition"}),
      nearMiss: z.number().min(0, {message: "Please enter nearmiss"}),
      processSafety: z.number().min(0, {message: "Please enter process safety"}),
      // todayParticipationRate: z.number().min(0, {message: "Please enter today participation rate"}),
      // monthlyParticipationRate: z.number().min(0, {message: "Please enter monthly participation rate"}),
      // ytdParticipationRate: z.number().min(0, {message: "Please enter ytd participation rate"}),
      // todayParticipate: z.number().min(0, {message: "Please enter today participate"}),
      // monthlyParticipate: z.number().min(0, {message: "Please enter monthly participate"}),
      // ytdParticipate: z.number().min(0, {message: "Please enter ytd participate"}),
      // nonParticipants: z.array(z.record(z.string()))
    },
    defaultValue: {
      description: "",
      unsafeAction: 0,
      unsafeCondition: 0,
      nearMiss: 0,
      processSafety: 0,
      todayParticipationRate: 0,
      monthlyParticipationRate: 0,
      ytdParticipationRate: 0,
      todayParticipate: 0,
      monthlyParticipate: 0,
      ytdParticipate: 0,
      nonParticipants: [],
    }
  },
  operation: {
    form: {
      info: {
        title: "Operation"
      },
      region: {
        type: "text",
        name: "region",
        label: "Region",
        shortLabel: "Region",
        placeholder: "",
        border: borderColors[0]
      },
      currentHiPoActivity: {
        type: "textarea",
        name: "currentHiPoActivity",
        label: "Current Hi-Po Activity",
        shortLabel: "Current Hi-Po Activity",
        placeholder: "",
        border: borderColors[1],
        minRows: 8,
        maxRows: 8
      },
      forecastHiPoActivity: {
        type: "textarea",
        name: "forecastHiPoActivity",
        label: "Forecast Hi-Po Activity",
        shortLabel: "Forecast Hi-Po Activity",
        placeholder: "",
        border: borderColors[1],
        minRows: 8,
        maxRows: 8
      },
      windSpeed: {
        type: "text",
        name: "windSpeed",
        label: "Wind Speed (Knot)",
        shortLabel: "Wind Speed",
        placeholder: "",
        border: borderColors[1]
      },
      seaLevel: {
        type: "text",
        name: "seaLevel",
        label: "Sea Level (m)",
        shortLabel: "Sea Level",
        placeholder: "",
        border: borderColors[1]
      },
      skyCondition: {
        type: "text",
        name: "skyCondition",
        label: "Sky Condition",
        shortLabel: "Sky Condition",
        placeholder: "",
        border: borderColors[1]
      },
      pitchingRolling: {
        type: "text",
        name: "pitchingRolling",
        label: "Pitching & Rolling (Deg)",
        shortLabel: "Pitching & Rolling",
        placeholder: "",
        border: borderColors[1]
      },

    },
    schema: {
      region: z.string(),
      currentHiPoActivity: z.string(),
      forecastHiPoActivity: z.string(),
      windSpeed: z.string(),
      seaLevel: z.string(),
      skyCondition: z.string(),
      pitchingRolling: z.string(),
    },
    defaultValue: {
      region: "",
      currentHiPoActivity: "",
      forecastHiPoActivity: "",
      windSpeed: "",
      seaLevel: "",
      skyCondition: "",
      pitchingRolling: "",
    }
  },
  vesselUnderPnO: {
    form: {
      info: {
        title: "Vessel Under P&O",
        border: borderColors[0]
      },
      totalBoatToday: {
        type: "number",
        name: "totalBoatToday",
        label: "Total Boat Today",
        shortLabel: "Today Boat",
        placeholder: "",
        border: borderColors[1]
      },
      totalBoatMonthly: {
        type: "number",
        name: "totalBoatMonthly",
        label: "Total Boat Monthly",
        shortLabel: "Monthly Boat",
        placeholder: "",
        border: borderColors[1]
      },
      totalBoatYtd: {
        type: "number",
        name: "totalBoatYtd",
        label: "Total Boat YTD",
        shortLabel: "YTD Boat",
        placeholder: "",
        border: borderColors[1]
      },
      totalEmployeeToday: {
        type: "number",
        name: "totalEmployeeToday",
        label: "Total Employee Today",
        shortLabel: "Today Employee",
        placeholder: "",
        border: borderColors[1]
      },
      totalEmployeeMonthly: {
        type: "number",
        name: "totalEmployeeMonthly",
        label: "Total Employee Monthly",
        shortLabel: "Monthly Employee",
        placeholder: "",
        border: borderColors[1]
      },
      totalEmployeeYtd: {
        type: "number",
        name: "totalEmployeeYtd",
        label: "Total Employee YTD",
        shortLabel: "YTD Employee",
        placeholder: "",
        border: borderColors[1]
      },
    },
    schema: {
      totalBoatToday: z.number().min(0, "Total Boat Today is required"),
      totalBoatMonthly: z.number().min(0, "Total Boat Monthly is required"),
      totalBoatYtd: z.number().min(0, "Total Boat YTD is required"),
      totalEmployeeToday: z.number().min(0, "Total Employee Today is required"),
      totalEmployeeMonthly: z.number().min(0, "Total Employee Monthly is required"),
      totalEmployeeYtd: z.number().min(0, "Total Employee YTD is required"),
    },
    defaultValue: {
      totalBoatToday: 0,
      totalBoatMonthly: 0,
      totalBoatYtd: 0,
      totalEmployeeToday: 0,
      totalEmployeeMonthly: 0,
      totalEmployeeYtd: 0,
    }
  },
  supportingFiles: {
    form: {
      files: {
        type: "file",
        name: "files",
        label: "Files",
        shortLabel: "Files",
        placeholder: "",
        border: borderColors[1]
      },
    },
    schema: {
      files: z.array(z.object({})),
    },
    defaultValue: {
      files: []
    }
  }
}