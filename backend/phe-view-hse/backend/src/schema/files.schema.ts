import { Type } from '@sinclair/typebox';

// Untuk route: /supporting-files/:id/view
export const GetSupportingFileParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const GetSupportingFileQuery = Type.Object({
  reportId: Type.String({ format: 'uuid' }),
});

export const DeleteByIdParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const DeleteByReportIdQuery = Type.Object({
  reportId: Type.String({ format: 'uuid' }),
});
