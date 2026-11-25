import { Type } from '@sinclair/typebox';

export const MetricsRequestSchema = Type.Object({
  basis: Type.Union([
    Type.Literal('default'),
    Type.Literal('range'),
    Type.Literal('all')
  ]),
  date_start: Type.Optional(Type.String({ format: 'date' })),
  date_end: Type.Optional(Type.String({ format: 'date' })),
  formTypes: Type.Optional(
    Type.Array(Type.Union([
      Type.Literal('project'),
      Type.Literal('marine')
    ])) // Allow empty array to default to all form types
  ),
  subtype: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  vesselId: Type.Optional(Type.Array(Type.String()))
});