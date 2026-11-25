import { z } from "zod"
import { DRILL_TYPE, getMeetingTypeFrom, INSTANCE_TYPE, PERMIT_TO_WORK_TYPE, PROJECT_SUBTYPE, REPORT_TYPE, TRAINING_TYPE } from "@/constants/app-enum";
import { TabListReportProps, borderColors } from "./constants";

export const tabListProjectReport: TabListReportProps = {
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
    label: "Meeting",
    desc: "Daily report meeting",
  },
  drill: {
    value: "drill",
    label: "Drill",
    desc: "Daily report drill",
  },
  training: {
    value: "training",
    label: "Training",
    desc: "Daily report training",
  },
  preUseInspection: {
    value: "preUseInspection",
    label: "Pre-Use Inspection",
    desc: "Daily report Pre-use inspection",
  },
  inspection: {
    value: "inspection",
    label: "Inspection",
    desc: "Daily report inspection",
  },
  smartCard: {
    value: "smartCard",
    label: "Kartu Pintar",
    desc: "Daily report kartu pintar",
  },
  permitToWork: {
    value: "permitToWork",
    label: "Permit To Work",
    desc: "Daily report permit to work",
  },
  dailyHighlights: {
    value: "dailyHighlights",
    label: "Today's Highlights",
    desc: "Daily report today's highlights",
  },
  uploadFile: {
    value: "uploadFile",
    label: "Supporting Files",
    desc: "Daily report supporting files",
  },
}

export const formList = {
  identity: {
    form: {
      reportDate: {
        type: "date",
        name: "reportDate",
        label: "Report Date",
      },
      reportedBy: {
        type: "text",
        name: "reportedBy",
        label: "Reported By",
      },
      instansi: {
        type: "select",
        name: "instansi",
        label: "Instance",
        placeholder: "Select Instance",
        options: Object.values(INSTANCE_TYPE),
      },
      formType: {
        type: "select",
        name: "formType",
        label: "Type of Form",
        placeholder: "Select Type of Form",
        options: Object.values(REPORT_TYPE),
      },
      subtype: {
        type: "combobox",
        name: "subtype",
        label: "Nama Project",
        placeholder: "Select Project Type",
        options: Object.values(PROJECT_SUBTYPE),
      },
    },
    schema: {
      reportDate: z.coerce.date({ required_error: "Please select report date" }),
      reportedBy: z.string().min(1, { message: "Please enter reported name" }),
      instansi: z.string().min(1, { message: "Please select instance" }),
      formType: z.string().min(1, { message: "Please select type of form" }),
      subtype: z.string().min(1, { message: "Please select sub type" }),
      workLocationId: z.string().optional().nullable(),
    },
    defaultValue: {
      reportDate: new Date(),
      reportedBy: "",
      instansi: "",
      formType: "",
      subtype: "",
      workLocationId: "",
      // reportedBy: "Putri",
      // instansi: "PHE OSES",
      // formType: "project",
      // subtype: "GCU",
    }
  },
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
        type: "checkbox",
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
      freeLtaDays: z.number().min(0, { message: "Please enter freeLtaDays" }),
      freeRiDays: z.number().min(0, { message: "Please enter freeRiDays" }),
      fatality: z.number().min(0, { message: "Please enter fatality" }),
      lti: z.number().min(0, { message: "Please enter lti" }),
      restrictedWorkDayCase: z.number().min(0, { message: "Please enter restricted work day case" }),
      medicalTreatmentCase: z.number().min(0, { message: "Please enter medical treatment case" }),
      firstAid: z.number().min(0, { message: "Please enter first aid" }),
      nearMiss: z.number().min(0, { message: "Please enter near miss" }),
      unsafeAction: z.number().min(0, { message: "Please enter unsafe action" }),
      unsafeCondition: z.number().min(0, { message: "Please enter unsafe condition" }),
      environmentalDamage: z.number().min(0, { message: "Please enter environmental damage" }),
      propertyDamage: z.number().min(0, { message: "Please enter property damage" }),
      recordableIncident: z.number().min(0, { message: "Please enter recordable incident" }),
      nonRecordableIncident: z.number().min(0, { message: "Please enter non recordable incident" }),
    },
    defaultValue: {
      statusFreeLtaRi: true,
      description: "",
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
      pobPheOses: z.number().min(0, { message: "Please enter pob phe oses" }),
      pobContractor: z.number().min(0, { message: "Please enter pob contractor" }),
      // dailyMandays: z.number().min(0, {message: "Please enter daily mandays"}),
      // monthlyMandays: z.number().min(0, {message: "Please enter monthly mandays"}),
      // ytdMandays: z.number().min(0, {message: "Please enter ytd mandays"}),
      // todayManhours: z.number().min(0, {message: "Please enter today manhours"}),
      // monthlyManhours: z.number().min(0, {message: "Please enter monthly manhours"}),
      // ytdManhours: z.number().min(0, {message: "Please enter ytd manhours"}),
      hoursPobPheOses: z.number().min(0, { message: "Please enter hours pob phe oses" }),
      hoursPobContractor: z.number().min(0, { message: "Please enter hours pob contractor" })
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
        options: Object.values(getMeetingTypeFrom("project")),
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
      status: z.string().min(1, { message: "Please enter jenis meeting" }),
      description: z.string().min(1, { message: "Please enter meeting description" }),
      absencePercentage: z.number().min(0, { message: "Please enter valid total participant" }),
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
        label: "Deskripsi Drill",
        shortLabel: "Deskripsi Drill",
        placeholder: "",
        border: borderColors[0]
      },
      fireDrill: {
        type: "number",
        name: "fireDrill",
        label: "Fire Drill",
        shortLabel: "Fire Drill",
        placeholder: "",
        border: borderColors[0]
      },
      abandonDrill: {
        type: "number",
        name: "abandonDrill",
        label: "Abandoned Drill",
        shortLabel: "Abandon Drill",
        placeholder: "",
        border: borderColors[0]
      },
      musteringDrill: {
        type: "number",
        name: "musteringDrill",
        label: "Mustering Drill",
        shortLabel: "Mustering Drill",
        placeholder: "",
        border: borderColors[0]
      },
      medievacDrill: {
        type: "number",
        name: "medievacDrill",
        label: "Medievac Drill",
        shortLabel: "Medievac Drill",
        placeholder: "",
        border: borderColors[0]
      },
      h2sDrill: {
        type: "number",
        name: "h2sDrill",
        label: "H2S Drill",
        shortLabel: "H2S Drill",
        placeholder: "",
        border: borderColors[0]
      },
      manOverboardDrill: {
        type: "number",
        name: "manOverboardDrill",
        label: "MOB Drill",
        shortLabel: "MOB Drill",
        placeholder: "",
        border: borderColors[0]
      },
      othersDrill: {
        type: "number",
        name: "othersDrill",
        label: "Other Drill",
        shortLabel: "Others",
        placeholder: "",
        border: borderColors[0]
      },
      todayDrill: {
        type: "number",
        name: "todayDrill",
        label: "Today Drill",
        shortLabel: "Daily Drill",
        placeholder: "",
        border: borderColors[1]
      },
      monthlyDrill: {
        type: "number",
        name: "monthlyDrill",
        label: "Monthly Drill",
        shortLabel: "Monthly Drill",
        placeholder: "",
        border: borderColors[1]
      },
      ytdDrill: {
        type: "number",
        name: "ytdDrill",
        label: "YTD Drill",
        shortLabel: "YTD Drill",
        placeholder: "",
        border: borderColors[0]
      },
      collisionDrill: {
        type: "number",
        name: "collisionDrill",
        label: "Collision Drill",
        shortLabel: "Collision Drill",
        placeholder: "",
        border: borderColors[0]
      },
      dryDrill: {
        type: "number",
        name: "dryDrill",
        label: "Dry Drill",
        shortLabel: "Dry Drill",
        placeholder: "",
        border: borderColors[0]
      },
      wetDrill: {
        type: "number",
        name: "wetDrill",
        label: "Wet Drill",
        shortLabel: "Wet Drill",
        placeholder: "",
        border: borderColors[0]
      }
    },
    schema: {
      status: z.string().min(1, { message: "Please enter drill status" }),
      description: z.string().min(0, { message: "Please enter drill description" }),
      fireDrill: z.number().min(0, { message: "Please enter fire drill" }),
      abandonDrill: z.number().min(0, { message: "Please enter abandoned drill" }),
      musteringDrill: z.number().min(0, { message: "Please enter mustering drill" }),
      medievacDrill: z.number().min(0, { message: "Please enter medievac drill" }),
      h2sDrill: z.number().min(0, { message: "Please enter h2s drill" }),
      manOverboardDrill: z.number().min(0, { message: "Please enter mob drill" }),
      othersDrill: z.number().min(0, { message: "Please enter other drill" }),
      // todayDrill: z.number().min(0, {message: "Please enter today drill"}),
      // monthlyDrill: z.number().min(0, {message: "Please enter monthly drill"}),
      // ytdDrill: z.number().min(0, {message: "Please enter ytd drill"}),
      collisionDrill: z.number().min(0, { message: "Please enter collision drill" }),
      dryDrill: z.number().min(0, { message: "Please enter dry drill" }),
      wetDrill: z.number().min(0, { message: "Please enter wet drill" })
    },
    defaultValue: {
      status: "",
      description: "",
      fireDrill: 0,
      abandonDrill: 0,
      musteringDrill: 0,
      medievacDrill: 0,
      h2sDrill: 0,
      manOverboardDrill: 0,
      othersDrill: 0,
      todayDrill: 0,
      monthlyDrill: 0,
      ytdDrill: 0,
      collisionDrill: 0,
      dryDrill: 0,
      wetDrill: 0
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
        label: "Jenis Training",
        shortLabel: "Jenis Training",
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
        label: "Total Participants",
        shortLabel: "Total Participants",
        placeholder: "",
        border: borderColors[0]
      },
      clsr: {
        type: "number",
        name: "clsr",
        label: "CLSR",
        shortLabel: "CLSR",
        placeholder: "",
        border: borderColors[0]
      },
      akhlak: {
        type: "number",
        name: "akhlak",
        label: "Akhlak",
        shortLabel: "Akhlak",
        placeholder: "",
        border: borderColors[0]
      },
      unsafeActionCategory: {
        type: "number",
        name: "unsafeActionCategory",
        label: "Unsafe Action Category",
        shortLabel: "UAC",
        placeholder: "",
        border: borderColors[0]
      },
      sika: {
        type: "number",
        name: "sika",
        label: "SIKA",
        shortLabel: "SIKA",
        placeholder: "",
        border: borderColors[0]
      },
      l2ra: {
        type: "number",
        name: "l2ra",
        label: "L2RA",
        shortLabel: "L2RA",
        placeholder: "",
        border: borderColors[0]
      },
      preSiteInduction: {
        type: "number",
        name: "preSiteInduction",
        label: "Pre Site Induction",
        shortLabel: "Pre-SI",
        placeholder: "",
        border: borderColors[0]
      },
      siteInduction: {
        type: "number",
        name: "siteInduction",
        label: "Site Induction",
        shortLabel: "SI",
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
        shortLabel: "Daily Training",
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
      }
    },
    schema: {
      status: z.string().min(1, { message: "Please enter training status" }),
      description: z.string(),
      clsr: z.number().min(0, { message: "Please enter clsr" }),
      akhlak: z.number().min(0, { message: "Please enter akhlak" }),
      unsafeActionCategory: z.number().min(0, { message: "Please enter unsafe action" }),
      sika: z.number().min(0, { message: "Please enter sika" }),
      l2ra: z.number().min(0, { message: "Please enter l2ra" }),
      preSiteInduction: z.number().min(0, { message: "Please enter pre site induction" }),
      siteInduction: z.number().min(0, { message: "Please enter site induction" }),
      othersTraining: z.number().min(0, { message: "Please enter other training" }),
      totalParticipants: z.number().min(0, { message: "Please enter total participants" }),
      // todayTraining: z.number().min(0, {message: "Please enter today training"}),
      // monthlyTraining: z.number().min(0, {message: "Please enter monthly training"}),
      // ytdTraining: z.number().min(0, {message: "Please enter ytd training"}),
    },
    defaultValue: {
      status: "",
      description: "",
      clsr: 0,
      akhlak: 0,
      unsafeActionCategory: 0,
      sika: 0,
      l2ra: 0,
      preSiteInduction: 0,
      siteInduction: 0,
      othersTraining: 0,
      todayTraining: 0,
      monthlyTraining: 0,
      ytdTraining: 0,
      totalParticipants: 0
    }
  },
  preUseInspection: {
    form: {
      info: {
        title: "Pre-Use Inspection"
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Pre-Use Inspection Description",
        shortLabel: "Highlight Pre-Use Inspection",
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
      outstandingFinding: {
        type: "number",
        name: "outstandingFinding",
        label: "Outstanding Findings",
        shortLabel: "Outstanding Finding",
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
      followUp: {
        type: "text",
        name: "followUp",
        label: "Follow Up",
        shortLabel: "UC",
        placeholder: "",
        border: borderColors[0]
      },
      todayDescription: {
        type: "text",
        name: "todayDescription",
        label: "Today's Description",
        shortLabel: "Today Description",
        placeholder: "",
        border: borderColors[0]
      },
      todayInspection: {
        type: "number",
        name: "todayInspection",
        label: "Today's Inspection",
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
      inpection: {
        type: "number",
        name: "inpection",
        label: "Inspection",
        shortLabel: "Inspection",
        placeholder: "",
        border: borderColors[1]
      }
    },
    schema: {
      type: z.string(),
      description: z.string(),
      openFinding: z.number().min(0, { message: "Please enter open findings" }),
      closeFinding: z.number().min(0, { message: "Please enter closed findings" }),
      outstandingFinding: z.number().min(0, { message: "Please enter outstanding findings" }),
      unsafeCondition: z.number().min(0, { message: "Please enter unsafe condition" }),
      followUp: z.string(),
      todayDescription: z.string(),
      todayInspection: z.number().min(0, { message: "Please enter today's inspection" }),
      monthlyInspection: z.number().min(0, { message: "Please enter monthly inspection" }),
      ytdInspection: z.number().min(0, { message: "Please enter ytd inspection" }),
      inspection: z.number().min(0, { message: "Please enter inspection" }),
    },
    defaultValue: {
      type: "pre_use",
      description: "",
      openFinding: 0,
      closeFinding: 0,
      outstandingFinding: 0,
      unsafeCondition: 0,
      followUp: "",
      todayDescription: "",
      todayInspection: 0,
      monthlyInspection: 0,
      ytdInspection: 0,
      inspection: 0
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
        label: "Inspection Description",
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
        shortLabel: "Close Finding",
        placeholder: "",
        border: borderColors[0]
      },
      outstandingFinding: {
        type: "number",
        name: "outstandingFinding",
        label: "Outstanding Findings",
        shortLabel: "Outstanding Finding",
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
      followUp: {
        type: "text",
        name: "followUp",
        label: "Follow Up",
        shortLabel: "UC",
        placeholder: "",
        border: borderColors[0]
      },
      todayDescription: {
        type: "text",
        name: "todayDescription",
        label: "Today's Description",
        shortLabel: "Today Description",
        placeholder: "",
        border: borderColors[0]
      },
      todayInspection: {
        type: "number",
        name: "todayInspection",
        label: "Today's Inspection",
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
      inpection: {
        type: "number",
        name: "inpection",
        label: "Inspection",
        shortLabel: "Inspection",
        placeholder: "",
        border: borderColors[1]
      }
    },
    schema: {
      type: z.string(),
      description: z.string(),
      openFinding: z.number().min(0, { message: "Please enter open findings" }),
      closeFinding: z.number().min(0, { message: "Please enter closed findings" }),
      outstandingFinding: z.number().min(0, { message: "Please enter outstanding findings" }),
      unsafeCondition: z.number().min(0, { message: "Please enter unsafe condition" }),
      followUp: z.string(),
      todayDescription: z.string(),
      todayInspection: z.number().min(0, { message: "Please enter today's inspection" }),
      monthlyInspection: z.number().min(0, { message: "Please enter monthly inspection" }),
      ytdInspection: z.number().min(0, { message: "Please enter ytd inspection" }),
      inspection: z.number().min(0, { message: "Please enter inspection" }),
    },
    defaultValue: {
      type: "field",
      description: "",
      openFinding: 0,
      closeFinding: 0,
      outstandingFinding: 0,
      unsafeCondition: 0,
      followUp: "",
      todayDescription: "",
      todayInspection: 0,
      monthlyInspection: 0,
      ytdInspection: 0,
      inspection: 0
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
        shortLabel: "Process Safety",
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
        type: "number",
        name: "nonParticipants",
        label: "Pekerja Yang Tidak Input Kartu Pintar",
        shortLabel: "Pekerja Yang Tidak Input Kartu Pintar",
        placeholder: "",
        border: borderColors[2]
      }
    },
    schema: {
      description: z.string(),
      unsafeAction: z.number().min(0, { message: "Please enter unsafe action" }),
      unsafeCondition: z.number().min(0, { message: "Please enter unsafe condition" }),
      nearMiss: z.number().min(0, { message: "Please enter nearmiss" }),
      processSafety: z.number().min(0, { message: "Please enter process safety" }),
      // todayParticipationRate: z.number().min(0, {message: "Please enter today participation rate"}),
      // monthlyParticipationRate: z.number().min(0, {message: "Please enter monthly participation rate"}),
      // ytdParticipationRate: z.number().min(0, {message: "Please enter ytd participation rate"}),
      // todayParticipate: z.number().min(0, {message: "Please enter today participate"}),
      // monthlyParticipate: z.number().min(0, {message: "Please enter monthly participate"}),
      // ytdParticipate: z.number().min(0, {message: "Please enter ytd participate"}),
      nonParticipants: z.array(z.record(z.string()))
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
  permitToWork: {
    form: {
      info: {
        title: "Permit To Work"
      },
      status: {
        type: "select",
        name: "status",
        label: "Permit To Work Type",
        shortLabel: "PTW Type",
        placeholder: "",
        options: Object.values(PERMIT_TO_WORK_TYPE).map(type => ({
          value: type.value,
          label: type.label,
          color: type.color
        })),
        border: borderColors[0]
      },
      description: {
        type: "textarea",
        name: "description",
        label: "Permit To Work Description",
        shortLabel: "Highlight Permit To Work",
        placeholder: "",
        border: borderColors[0]
      },
      cwpL1: {
        type: "number",
        name: "cwpL1",
        label: "Cold Work",
        shortLabel: "Cold Work",
        placeholder: "",
        border: borderColors[0]
      },
      hwspL1: {
        type: "number",
        name: "hwspL1",
        label: "Hot Work (Spark Potential)",
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
        label: "Cold Work (Breaking Containment)",
        shortLabel: "CWP-L2",
        placeholder: "",
        border: borderColors[0]
      },
      hwspL2: {
        type: "number",
        name: "hwspL2",
        label: "Hot Work (Naked Flame)",
        shortLabel: "HWSP-L2",
        placeholder: "",
        border: borderColors[0]
      },
      isolationConfirmationCertificate: {
        type: "number",
        name: "isolationConfirmationCertificate",
        label: "Isolation Confirmation Certificate",
        shortLabel: "Confirmation Certificate",
        placeholder: "",
        border: borderColors[0]
      },
      todayPtw: {
        type: "number",
        name: "todayPtw",
        label: "Today's PTW",
        shortLabel: "Daily PTW",
        placeholder: "",
        border: borderColors[1]
      },
      monthlyPtw: {
        type: "number",
        name: "monthlyPtw",
        label: "Monthly PTW",
        shortLabel: "Monthly PTW",
        placeholder: "",
        border: borderColors[1]
      },
      ytdPtw: {
        type: "number",
        name: "ytdPtw",
        label: "YTD PTW",
        shortLabel: "YTD PTW",
        placeholder: "",
        border: borderColors[1]
      },
      openDate: {
        type: "date",
        name: "openDate",
        label: "Open Date",
        shortLabel: "Open Date",
        placeholder: "",
        border: borderColors[0]
      },
      noPTW: {
        type: "text",
        name: "noPTW",
        label: "No. of PTW",
        shortLabel: "No. of PTW",
        placeholder: "",
        border: borderColors[0]
      },
      location: {
        type: "text",
        name: "location",
        label: "Location",
        shortLabel: "Location",
        placeholder: "",
        border: borderColors[0]
      },
      RA_JSA: {
        type: "text",
        name: "RA_JSA",
        label: "RA/JSAA",
        shortLabel: "RA/JSAA",
        placeholder: "",
        border: borderColors[0]
      },
      performingAuthority: {
        type: "text",
        name: "performingAuthority",
        label: "Performing Authority",
        shortLabel: "Performing Authority",
        placeholder: "",
        border: borderColors[0]
      },
      siteController: {
        type: "text",
        name: "siteController",
        label: "Site Controller",
        shortLabel: "Site Controller",
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
      status: z.string().min(1, { message: "Please select status" }),
      description: z.string(),
      // cwpL1: z.number().min(0, { message: "Please enter cwp l1" }),
      // hwspL1: z.number().min(0, { message: "Please enter hwsp l1" }),
      // confinedSpace1: z.number().min(0, { message: "Please enter confined space 1" }),
      // cwpL2: z.number().min(0, { message: "Please enter cwp l2" }),
      // hwspL2: z.number().min(0, { message: "Please enter hwsp l2" }),
      // isolationConfirmationCertificate: z.number().optional(),
      // todayPtw: z.number().min(0, {message: "Please enter today ptw"}),
      // monthlyPtw: z.number().min(0, {message: "Please enter monthly ptw"}),
      // ytdPtw: z.number().min(0, {message: "Please enter ytd ptw"}),
      openDate: z.date().optional(),
      noPTW: z.string().optional(),
      location: z.string().optional(),
      RA_JSA: z.string().optional(),
      performingAuthority: z.string().optional(),
      siteController: z.string().optional(),
      evidence: z.array(z.any()).optional(),
    },
    defaultValue: {
      status: "",
      description: "",
      // cwpL1: 0,
      // hwspL1: 0,
      // confinedSpace1: 0,
      // cwpL2: 0,
      // hwspL2: 0,
      // todayPtw: 0,
      // monthlyPtw: 0,
      // ytdPtw: 0,
      // generalWork: 0,
      // criticalWork: 0,
      // hotWork: 0,
      // breakingContainment: 0,
      // confinedSpace: 0,
      // isolationConfirmationCertificate: 0,
      openDate: new Date(),
      noPTW: "",
      location: "",
      RA_JSA: "",
      performingAuthority: "",
      siteController: "",
      evidence: []
    }
  },
  dailyHighlights: {
    form: {
      info: {
        title: "Daily Highlights"
      },
      dailyActivities: {
        type: "textarea",
        name: "dailyActivities",
        label: "Daily Activities",
        shortLabel: "Daily Activities",
        placeholder: "",
        border: borderColors[1]
      },
      dailyNextPlan: {
        type: "textarea",
        name: "dailyNextPlan",
        label: "Daily Next Plan",
        shortLabel: "Daily Next Plan",
        placeholder: "",
        border: borderColors[1]
      },
      weather: {
        type: "textarea",
        name: "weather",
        label: "Weather",
        shortLabel: "Weather",
        placeholder: "",
        border: borderColors[0]
      },
      overstayPersonnel: {
        type: "textarea",
        name: "overstayPersonnel",
        label: "Overstay Personnel List",
        shortLabel: "Overstay Personnel List",
        placeholder: "",
        border: borderColors[2]
      },
      hsseIssues: {
        type: "textarea",
        name: "hsseIssues",
        label: "HSSE Issues",
        shortLabel: "HSSE Issues",
        placeholder: "",
        border: borderColors[2]
      }
    },
    schema: {
      dailyActivities: z.string(),
      dailyNextPlan: z.string(),
      weather: z.string(),
      overstayPersonnel: z.array(
        z.object({
          name: z.string(),
          company: z.string(),
          dob: z.string(),
        })
      ),
    },
    defaultValue: {
      dailyActivities: "",
      dailyNextPlan: "",
      weather: "",
      overstayPersonnel: []
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
