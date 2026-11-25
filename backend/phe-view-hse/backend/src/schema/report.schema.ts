import {type Static, Type} from '@sinclair/typebox'

export const ListDailyReportsSchema = Type.Object({
  date_start: Type.Optional(Type.String()),
  date_end: Type.Optional(Type.String()),
  formTypes: Type.Optional(
    Type.Array(Type.String(), {
      examples: [["project", "marine"]],
    })
  ),
  instansi: Type.Optional(Type.Array(Type.String())),
  subtypes: Type.Optional(Type.Array(Type.String())),
  workLocations: Type.Optional(Type.Array(Type.String())),
  sort: Type.Optional(Type.String({
    enum: ['reportDate', 'formType', 'instansi', 'createdAt', 'updatedAt'],
    default: 'reportDate',
  })),
  order: Type.Optional(Type.String({
    enum: ['asc', 'desc'],
    default: 'desc',
  })),
  page: Type.Optional(Type.Number({ default: 0 })),
  view: Type.Optional(Type.Number({ default: 10 })),
  showDetails: Type.Optional(Type.Boolean({ default: false })),
});

export const FileSchema = Type.Object({
  file: Type.String(),
});

export const InspectionItemSchema = Type.Object({
  id: Type.Optional(Type.String()), // untuk update
  type: Type.Union([Type.Literal('pre_use'), Type.Literal('field')]),
  description: Type.Optional(Type.String()),
  finding: Type.Optional(Type.String()),
  openFinding: Type.Optional(Type.Integer()),
  closeFinding: Type.Optional(Type.Integer()),
  outstandingFinding: Type.Optional(Type.Integer()),
  noIssue: Type.Optional(Type.Integer()),
  lsaInspection: Type.Optional(Type.Integer()),
  ffaInspection: Type.Optional(Type.Integer()),
  ppeInspection: Type.Optional(Type.Integer()),
  otherInspection: Type.Optional(Type.Integer()),
  followUp: Type.Optional(Type.String()),
  deadline: Type.Optional(Type.String()),
  files: Type.Optional(Type.Array(FileSchema)),
});

export const MeetingSchema = Type.Object({
  id: Type.Optional(Type.String()),
  description: Type.String(),
  jenisMeeting: Type.String(),
  absencePercentage: Type.Integer(),
  toolbox: Type.Integer(),
  generalSafety: Type.Integer(),
  safetyCommittee: Type.Integer(),
  preJob: Type.Integer(),
  hsseSiteOrientation: Type.Integer(),
  marineContractorMeeting: Type.Integer(),
  safetyStandDownMeeting: Type.Integer(),
  managementSafetyVisit: Type.Integer(),
  others: Type.Integer(),
  files: Type.Optional(Type.Array(FileSchema)),
});

export const DrillSchema = Type.Object({
  id: Type.Optional(Type.String()),
  description: Type.String(),
  fireDrill: Type.Integer(),
  abandonDrill: Type.Integer(),
  musteringDrill: Type.Integer(),
  medievacDrill: Type.Integer(),
  h2sDrill: Type.Integer(),
  mobDrill: Type.Integer(),
  oilPollutionPreventionDrill: Type.Integer(),
  steeringGearFailureDrill: Type.Integer(),
  manOverboardDrill: Type.Integer(),
  groundingDrill: Type.Integer(),
  firstAidDrill: Type.Integer(),
  othersDrill: Type.Integer(),
  files: Type.Optional(Type.Array(FileSchema)),
});

export const TrainingSchema = Type.Object({
  id: Type.Optional(Type.String()),
  description: Type.String(),
  clsr: Type.Integer(),
  akhlak: Type.Integer(),
  unsafeActionCategory: Type.Integer(),
  sika: Type.Integer(),
  l2ra: Type.Integer(),
  preSiteInduction: Type.Integer(),
  siteInduction: Type.Integer(),
  shipboardTraining: Type.Integer(),
  othersTraining: Type.Integer(),
  files: Type.Optional(Type.Array(FileSchema)),
});

export const PermitSchema = Type.Object({
  id: Type.Optional(Type.String()),
  description: Type.String(),
  openDate: Type.Optional(Type.String()),
  noPTW: Type.Optional(Type.String()),
  location: Type.Optional(Type.String()),
  RA_JSA: Type.Optional(Type.String()),
  performingAuthority: Type.Optional(Type.String()),
  siteController: Type.Optional(Type.String()),
  generalWork: Type.Optional(Type.Integer()),
  breakingContainment: Type.Optional(Type.Integer()),
  hotWork: Type.Optional(Type.Integer()),
  criticalWork: Type.Optional(Type.Integer()),
  confinedSpace: Type.Optional(Type.Integer()),
  cwpL1: Type.Optional(Type.Integer()),
  hwspL1: Type.Optional(Type.Integer()),
  confinedSpace1: Type.Optional(Type.Integer()),
  cwpL2: Type.Optional(Type.Integer()),
  hwspL2: Type.Optional(Type.Integer()),
  confinedSpace2: Type.Optional(Type.Integer()),
  isolationConfirmationCertificate: Type.Optional(Type.Integer()),
  files: Type.Optional(Type.Array(FileSchema)),
});

// SCHEMA DAILY FORM
export const DailyFormSchema = Type.Object({
  reportDate: Type.String(),
  reportedBy: Type.String(),
  instansi: Type.String(),
  formType: Type.Union([Type.Literal('project'), Type.Literal('marine')]),
  subtype: Type.Optional(Type.String()),
  workLocationId: Type.Optional(Type.Union([Type.String(), Type.Null()])),

  // COMMON
  lagging: Type.Optional(Type.Object({
    description: Type.Optional(Type.String()),
    statusFreeLtaRi: Type.Optional(Type.Boolean()),
    freeLtaDays: Type.Integer(),
    freeRiDays: Type.Integer(),
    recordableIncident: Type.Integer(),
    nonRecordableIncident: Type.Integer(),
    fatality: Type.Integer(),
    lti: Type.Integer(),
    restrictedWorkDayCase: Type.Integer(),
    medicalTreatmentCase: Type.Integer(),
    firstAid: Type.Integer(),
    nearMiss: Type.Integer(),
    unsafeAction: Type.Integer(),
    unsafeCondition: Type.Integer(),
    environmentalDamage: Type.Integer(),
    propertyDamage: Type.Integer()
  })),

  manhours: Type.Optional(Type.Object({
    pobPheOses: Type.Integer(),
    pobContractor: Type.Integer(),
    hoursPobPheOses: Type.Integer(),
    hoursPobContractor: Type.Integer(),
  })),

  smartCard: Type.Optional(Type.Object({
    description: Type.String(),
    unsafeAction: Type.Integer(),
    unsafeCondition: Type.Integer(),
    nearMiss: Type.Integer(),
    processSafety: Type.Integer(),
    nonParticipants: Type.Array(Type.Object({
      name: Type.String(),
      company: Type.String(),
    })),
  })),

  supportingFiles: Type.Optional(Type.Array(Type.Object({
    id: Type.String({ format: 'uuid' }),
    reportId: Type.String({ format: 'uuid' }),
    fileName: Type.String(),
    fileType: Type.String(),
    filePath: Type.String(),
    note: Type.Optional(Type.String()),
    url: Type.String(),
    thumbnailUrl: Type.String(),
  }))),

  // PROJECT
  meeting: Type.Optional(MeetingSchema),
  drill: Type.Optional(DrillSchema),
  training: Type.Optional(TrainingSchema),
  permit: Type.Optional(PermitSchema),
  inspections: Type.Optional(Type.Array(InspectionItemSchema)),

  highlight: Type.Optional(Type.Object({
    dailyActivities: Type.String(),
    dailyNextPlan: Type.String(),
    weather: Type.String(),
    overstayPersonnel: Type.Array(Type.Object({
      name: Type.String(),
      company: Type.String(),
      dob: Type.String(),
    })),
  })),

  // MARINE
  operations: Type.Optional(Type.Array(Type.Object({
    region: Type.Union([Type.Literal('SBU'), Type.Literal('CBU'), Type.Literal('NBU')]),
    currentHiPoActivity: Type.String(),
    forecastHiPoActivity: Type.String(),
    windSpeed: Type.String(),
    seaLevel: Type.String(),
    skyCondition: Type.String(),
    pitchingRolling: Type.String(),
  }))),

  vesselsUnderPOSummary: Type.Optional(Type.Object({
    totalBoatToday: Type.Integer(),
    totalBoatMonthly: Type.Integer(),
    totalBoatYtd: Type.Integer(),
    totalEmployeeToday: Type.Integer(),
    totalEmployeeMonthly: Type.Integer(),
    totalEmployeeYtd: Type.Integer(),
  })),
}, {
});

export type DailyFormType = Static<typeof DailyFormSchema>;

const { meeting, drill, training, permit } = DailyFormSchema.properties;

// CREATE
export const CreateDailyFormSchema = Type.Object({
  reportDate: Type.String(),
  reportedBy: Type.String(),
  instansi: Type.String(),
  formType: Type.Union([Type.Literal('project'), Type.Literal('marine')]),
  subtype: Type.Optional(Type.String()),
  workLocationId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
}, {
});

// CREATE
export type CreateDailyFormType = Static<typeof CreateDailyFormSchema>;

// UPDATE
// --- PROJECT ---
export const UpdateProjectFormSchema = Type.Partial(
  Type.Intersect([
    Type.Pick(DailyFormSchema, [
      'reportDate',
      'reportedBy',
      'instansi',
      'lagging',
      'manhours',
      'smartCard',
      'highlight'
    ]),
    Type.Object({
      inspections: Type.Optional(Type.Array(Type.Partial(InspectionItemSchema))),
      meeting: Type.Optional(Type.Partial(meeting)),
      drill: Type.Optional(Type.Partial(drill)),
      training: Type.Optional(Type.Partial(training)),
      permit: Type.Optional(Type.Partial(permit)),
    })
  ])
);

export type UpdateProjectFormType = Static<typeof UpdateProjectFormSchema>;

// --- MARINE ---
export const UpdateMarineFormSchema = Type.Partial(
  Type.Pick(DailyFormSchema, [
    'reportDate',
    'reportedBy',
    'instansi',
    'lagging',
    'manhours',
    'smartCard',
    'operations',
    'vesselsUnderPo',
    'vesselsUnderPoSummary'
  ])
);
export type UpdateMarineFormType = Static<typeof UpdateMarineFormSchema>;

// --- CONTRACTOR (Hanya sebagian saat formType = 'marine') ---
export const UpdateContractorMarineFormSchema = Type.Partial(
  Type.Pick(DailyFormSchema, [
    'reportDate',
    'reportedBy',
    'instansi',
    'meeting',
    'drill',
    'training',
    'inspections',
    'permit'
  ])
);
export type UpdateContractorMarineFormType = Static<typeof UpdateContractorMarineFormSchema>;

// CHILD TYPES
export type InspectionInput = NonNullable<DailyFormType['inspections']>[number];
export type SmartCardParticipantInput = NonNullable<DailyFormType['smartCard']>['nonParticipants'][number];
export type OverstayPersonnelInput = NonNullable<DailyFormType['highlight']>['overstayPersonnel'][number];

// --- DUPLICATE ---
export const DuplicateDailyReportSchema = Type.Object({
  sourceReportId: Type.String({ format: 'uuid' }),
  reportDate: Type.String(),
  reportedBy: Type.String(),
  instansi: Type.String(),
  subtype: Type.Optional(Type.String()),
  workLocationId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export type DuplicateDailyReportType = Static<typeof DuplicateDailyReportSchema>;
