import { type Static, Type } from '@sinclair/typebox';

// Extended schemas with optional `id`
const WithId = (schema: any) =>
  Type.Intersect([
    Type.Object({ id: Type.Optional(Type.String({ format: 'uuid' })) }),
    schema,
  ]);

// Contract schema
export const ContractSchema = WithId(
  Type.Object({
    contractCode: Type.Optional(Type.String()),
    expiredDate: Type.Optional(Type.String({ format: 'date' })),
    expiredDateCompany: Type.Optional(Type.String({ format: 'date' })),
  })
);

// MCU schema
export const McuSchema = WithId(
  Type.Object({
    mcuDate: Type.Optional(Type.String({ format: 'date' })),
    mcuExpiredDate: Type.Optional(Type.String({ format: 'date' })),
    mcuHospitalName: Type.Optional(Type.String()),
    mcuDeviationNotes: Type.Optional(Type.String()),
    mcuFollowUp: Type.Optional(Type.String()),
    ohihReview: Type.Optional(Type.String()),
    statusKelaikanBekerja: Type.Optional(Type.String()),
    skjScore: Type.Optional(Type.String()),
  })
);

// BPJS schema
export const BpjsSchema = Type.Object({
  bpjsEmployment: Type.Optional(Type.String()),
  bpjsHealth: Type.Optional(Type.String()),
});

// Vaccination schema
export const VaccinationSchema = WithId(
  Type.Object({
    vaccineDate: Type.Optional(Type.String({ format: 'date' })),
    vaccineStatus: Type.Optional(Type.String()),
  })
);

// Certificate schema
export const CertificateSchema = WithId(
  Type.Object({
    name: Type.String(),
    expiredDate: Type.Optional(Type.String({ format: 'date' })),
    isPermanent: Type.Optional(Type.Boolean()),
    status: Type.Optional(Type.String()), // 'Still Valid' | 'Expired' | 'No Evidence'
  })
);

// SIKA schema
export const SikaSchema = WithId(
  Type.Object({
    status: Type.Optional(Type.String()), // 'Active', 'Inactive'
    expiredDate: Type.Optional(Type.String({ format: 'date' })),
  })
);

// Base employee schema
export const BaseEmployeeSchema = Type.Object({
  subContractorId: Type.String({ format: 'uuid' }),
  category: Type.Union([
    Type.Literal('marine'),
    Type.Literal('mitra'),
    Type.Literal('project'),
  ]),
  employeeName: Type.String({ minLength: 1 }),
  dateOfBirth: Type.Optional(Type.String({ format: 'date' })),
  position: Type.Optional(Type.String()),
  projectId: Type.Optional(Type.String()),
  projectName: Type.Optional(Type.String()),
  location: Type.Optional(Type.String()),
  vesselId: Type.Optional(Type.String()),
  identityNumber: Type.String({ minLength: 10, maxLength: 50 }),
  hssePassportNumber: Type.Optional(Type.String()),
  statusOnDuty: Type.Optional(Type.Boolean()),
  linkDataEmployee: Type.Optional(Type.String()),
  remarks: Type.Optional(Type.String()),
  otherHealthAssurance: Type.Optional(Type.String()),
  ppe: Type.Optional(Type.String()),
});

// Create schema (semua data, opsional untuk bagian relasi)
export const CreateFullEmployeeSchema = Type.Intersect([
  BaseEmployeeSchema,
  Type.Object({
    contract: Type.Optional(ContractSchema),
    mcu: Type.Optional(McuSchema),
    bpjs: Type.Optional(BpjsSchema),
    vaccination: Type.Optional(VaccinationSchema),
    certificates: Type.Optional(Type.Array(CertificateSchema)),
    sika: Type.Optional(SikaSchema),
  }),
]);

// Update schema
export const UpdateFullEmployeeSchema = Type.Object({
  employeeData: Type.Optional(Type.Partial(BaseEmployeeSchema)),
  contracts: Type.Optional(Type.Array(ContractSchema)),
  mcus: Type.Optional(Type.Array(McuSchema)),
  vaccinations: Type.Optional(Type.Array(VaccinationSchema)),
  certificates: Type.Optional(Type.Array(CertificateSchema)),
  sika: Type.Optional(Type.Array(SikaSchema)),
});

// Attendance update schema (for multipart form validation)
export const UpdateAttendanceSchema = Type.Object({
  status: Type.Union([Type.Literal('on_duty'), Type.Literal('off_duty')]),
  notes: Type.Optional(Type.String()),
  position: Type.Optional(Type.Any()),
  workLocationId: Type.Optional(Type.String()),
});

// Types
export type CreateFullEmployeeInput = Static<typeof CreateFullEmployeeSchema>;
export type UpdateFullEmployeeInput = Static<typeof UpdateFullEmployeeSchema>;
export type UpdateAttendanceInput = Static<typeof UpdateAttendanceSchema>;
