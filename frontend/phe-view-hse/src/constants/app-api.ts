/**
 * API Configuration and Route Management
 *
 * This file contains:
 * 1. API endpoints (AppApi)
 * 2. Route definitions with breadcrumbs (AppRoute)
 * 3. Helper functions for breadcrumb generation
 *
 * Usage examples:
 * - Get route URL: getRouteUrl('employee.list') // returns '/employee/list'
 * - Get breadcrumbs: useBreadcrumbs() hook automatically uses the centralized config
 * - Access route: AppRoute.employee.list.url
 * - Access breadcrumb: AppRoute.employee.list.breadcrumb
 */

export const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL
const APP_URL_V1 = APP_BASE_URL + "/api/v1"
const APP_URL_PUBLIC = APP_BASE_URL + "/api/public"

export const AppApi = {
  public: {
    geocode: APP_URL_PUBLIC + "/geocode/reverse",
  },
  auth: {
    login: APP_BASE_URL + "/api/auth/sign-in-email",
    loginHssePassport: APP_BASE_URL + "/api/auth/sign-in/hsse-passport",
    listUsers: APP_BASE_URL + "/api/auth/list-users",
  },
  dashboard: {
    metrics: APP_URL_V1 + "/user/dashboard/metrics",
    exportPdf: APP_URL_V1 + "/user/dashboard/export-pdf",
  },
  report: {
    list: APP_URL_V1 + "/user/daily_report/list",
    create: APP_URL_V1 + "/user/daily_report/create",
    detail: APP_URL_V1 + "/user/daily_report/detail",
    crud: APP_URL_V1 + "/user/daily_report",
    crudWithUpload: APP_URL_V1 + "/user/daily_report/update-with-upload",
    sectionDelete: APP_URL_V1 + "/user/daily_report/section",
    weather: APP_URL_V1 + "/user/daily_report/by-date",
    reportCategory: APP_URL_V1 + "/user/daily_report/report-category",
    reportDutyList: APP_URL_V1 + "/user/daily_report/on-duty",
    exportPdf: APP_URL_V1 + "/user/daily_report/export",
    readMail: APP_URL_V1 + "/user/daily_report/file/read-file",
    duplicate: APP_URL_V1 + "/user/daily_report/duplicate",
    syncPob: APP_URL_V1 + "/user/daily_report/sync-pob",
  },
  admin: {
    user: {
      list: APP_URL_V1 + "/admin/user/list",
      delete: APP_URL_V1 + "/admin/user/delete",
      create: APP_URL_V1 + "/admin/user/add",
      update: APP_URL_V1 + "/admin/user/update",
      changePassword: APP_URL_V1 + "/admin/user/change-password",
      crud: APP_URL_V1 + "/admin/user",
    }
  },
  user: {
    changePassword: APP_BASE_URL + "/api/auth/change-password",
    userInfo: APP_BASE_URL + "/api/auth/user-info",
    update: APP_BASE_URL + "/api/auth/update",
    sessionsList: APP_BASE_URL + "/api/auth/sessions-list",
    revokeOtherSessionsV1: APP_BASE_URL + "/api/auth/revoke-other-sessions-v1",
  },
  vessel: {
    list: APP_URL_V1 + "/user/daily_report/vessels/list",
    add: APP_URL_V1 + "/user/daily_report/vessels/add",
    crud: APP_URL_V1 + "/user/daily_report/vessels",
  },
  subTypes: {
    list: APP_URL_V1 + "/user/daily_report/subtypes/list",
    crud: APP_URL_V1 + "/user/daily_report/subtypes",
    workLocations: APP_URL_V1 + "/user/daily_report/work-locations",
    disableAllAuto: APP_URL_V1 + "/user/daily_report/subtypes/disable-all-auto",
  },
  contractor: {
    list: APP_URL_V1 + "/user/contractor/list",
    add: APP_URL_V1 + "/user/contractor/add",
    update: APP_URL_V1 + "/user/contractor/update",
    delete: APP_URL_V1 + "/user/contractor/delete",
  },
  contractorVessel: {
    list: APP_URL_V1 + "/user/contractor-vessel/list",
    assign: APP_URL_V1 + "/user/contractor-vessel/assign",
    getContractor: APP_URL_V1 + "/user/contractor-vessel/get-contractor",
    remove: APP_URL_V1 + "/user/contractor-vessel/remove",
  },
  employees: {
    attendance: {
      list: APP_URL_V1 + "/employee/attendance/list",
      update: APP_URL_V1 + "/employee/attendance/update",
      profile: APP_URL_V1 + "/employee/attendance/profile",
    },
  },
  employee: {
    list: APP_URL_V1 + "/user/employee/list",
    create: APP_URL_V1 + "/user/employee/create",
    delete: APP_URL_V1 + "/user/employee/delete",
    crud: APP_URL_V1 + "/user/employee",
    detail: APP_URL_V1 + "/user/employee/detail",
    deleteSection: APP_URL_V1 + "/user/employee/delete-section",
    deleteFiles: APP_URL_V1 + "/user/employee/delete-file",
    dashboard: APP_URL_V1 + "/user/employee/dashboard",
    companyRank: APP_URL_V1 + "/user/employee/dashboard/company-rank",
    importExcel: APP_URL_V1 + "/user/employee/import-excel",
    importExcelTemplate: APP_URL_V1 + "/user/employee/import-template",
    attendanceList: APP_URL_V1 + "/user/employee/attendance-list",
    attendanceManage: APP_URL_V1 + "/user/employee/attendance-manage",
    locations: APP_URL_V1 + "/user/employee/locations",
    smartCard: {
      dashboard: APP_URL_V1 + "/user/smart-card/dashboard",
      observationStatistics: APP_URL_V1 + "/user/smart-card/observation-statistics",
      employeesWithoutObservations: APP_URL_V1 + "/user/smart-card/employees-without-observations",
      upload: APP_URL_V1 + "/user/smart-card/upload-observations",
      uploadHistory: APP_URL_V1 + "/user/smart-card/upload-observations/history",
      errors: APP_URL_V1 + "/user/smart-card/upload-observations/errors",
      reprocessError: APP_URL_V1 + "/user/smart-card/upload-observations/reprocess",
      reprocessGroup: APP_URL_V1 + "/user/smart-card/upload-observations/reprocess-group",
      deleteErrors: APP_URL_V1 + "/user/smart-card/upload-observations/errors",
      deleteUploadHistory: APP_URL_V1 + "/user/smart-card/upload-observations/history",
    },
    pobUpdate: APP_URL_V1 + "/user/employee/pob-update",
    pobUnmatchedLogs: APP_URL_V1 + "/user/employee/pob-unmatched-logs",
    resolvePobSuggestion: APP_URL_V1 + "/user/employee/resolve-pob-suggestion",
  },
  csms: {
    dashboard: {
      dashboard: APP_URL_V1 + "/user/csms/dashboard",
      export: APP_URL_V1 + "/user/csms/dashboard/export",
      ongoing: APP_URL_V1 + "/user/csms/activities/ongoing",
      incoming: APP_URL_V1 + "/user/csms/activities/incoming",
    },
    guidelines: {
      list: APP_URL_V1 + "/user/csms/guideline/list",
      create: APP_URL_V1 + "/user/csms/guideline/create",
      crud: APP_URL_V1 + "/user/csms/guideline",
      deleteAssets: APP_URL_V1 + "/user/csms/guideline/files",
    },
    riskAssessment: {
      list: APP_URL_V1 + "/user/csms/risk/list",
      create: APP_URL_V1 + "/user/csms/risk/create",
      crud: APP_URL_V1 + "/user/csms/risk",
      update: APP_URL_V1 + "/user/csms/risk/update",
      deleteAssets: APP_URL_V1 + "/user/csms/risk/files",
    },
    qualificationAssessment: {
      list: APP_URL_V1 + "/user/csms/qualification/list",
      create: APP_URL_V1 + "/user/csms/qualification/create",
      crud: APP_URL_V1 + "/user/csms/qualification",
      update: APP_URL_V1 + "/user/csms/qualification/update",
      deleteAssets: APP_URL_V1 + "/user/csms/qualification/files",
    },
    contract: {
      contracts: APP_URL_V1 + "/user/csms/contract/contracts",
      submitApproval: APP_URL_V1 + "/user/csms/contract/folder/submit-approval",
    },
    contractManagement: {
      createContract: APP_URL_V1 + "/user/csms/contract/create-contract",
      contractFolders: APP_URL_V1 + "/user/csms/contract/folder/contract-folders",
      updateFolder: APP_URL_V1 + "/user/csms/contract/folder/update-folder",
      generateAssessmentFolder: APP_URL_V1 + "/user/csms/contract/folder/generate-assessment-folder",
      deleteFolder: APP_URL_V1 + "/user/csms/contract/folder/delete-folder",
      createSubfolder: APP_URL_V1 + "/user/csms/contract/folder/create-subfolder",
      uploadFileToFolder: APP_URL_V1 + "/user/csms/contract/file/upload-file-to-folder",
      deleteFile: APP_URL_V1 + "/user/csms/contract/file/delete-file",
      updateFile: APP_URL_V1 + "/user/csms/contract/file/update-file",
      fileDetails: APP_URL_V1 + "/user/csms/contract/file/file-details",
      deleteContract: APP_URL_V1 + "/user/csms/contract/contracts",
      updateAssessmentDates: APP_URL_V1 + "/user/csms/contract/update-assessment-dates",
      duplicateContractDir: APP_URL_V1 + "/user/csms/contract/file/copy-pb-files",
      // GET <copyPbFilesStatus>/<jobId>: status of the background copy started by duplicateContractDir
      copyPbFilesStatus: APP_URL_V1 + "/user/csms/contract/file/copy-pb-files",
      updateAssessmentFolder: APP_URL_V1 + "/user/csms/contract/folder/assessment",
      bulkAssessmentFolder: APP_URL_V1 + "/user/csms/contract/folder/bulk-assessment",
      updateFolderFinal: APP_URL_V1 + "/user/csms/contract/folder/update-folder-final-status",
      definalizeFolder: APP_URL_V1 + "/user/csms/contract/folder/definalize-folder",
      exportEvaluation: APP_URL_V1 + "/user/csms/contract/export-evaluasi",
      exportWithNote: APP_URL_V1 + "/user/csms/contract/export-catatan-perbaikan",
      exportEchsms: APP_URL_V1 + "/user/csms/contract/export-echsms",
      exportFolderAsZip: APP_URL_V1 + "/user/csms/contract/folder/export-folder",
      auditor: APP_URL_V1 + "/user/csms/contract/folder/auditor",
      assessmentDate: APP_URL_V1 + "/user/csms/contract/folder/assessment-date",
      sendEmailEvaluation: APP_URL_V1 + "/user/csms/contract/send-evaluasi-email",
      aiEvaluate: APP_URL_V1 + "/user/csms/contract/folder/evaluate",
      aiEvaluateStatus: APP_URL_V1 + "/user/csms/contract/folder/evaluate/status",
      aiEvaluateActive: APP_URL_V1 + "/user/csms/contract/folder/evaluate/active",
      aiEvaluateCancel: APP_URL_V1 + "/user/csms/contract/folder/evaluate/cancel",
      aiEngineHealth: APP_URL_V1 + "/user/csms/contract/folder/evaluate/engine-health",
      aiEvaluateChanged: APP_URL_V1 + "/user/csms/contract/folder/evaluate/changed",
      aiQuality: APP_URL_V1 + "/admin/csms-ai/quality",
      aiRubricVersions: APP_URL_V1 + "/admin/csms-ai/rubric/versions",
      aiRubricItems: APP_URL_V1 + "/admin/csms-ai/rubric/items",
      aiRubricImport: APP_URL_V1 + "/admin/csms-ai/rubric/import",
      aiRubricExport: APP_URL_V1 + "/admin/csms-ai/rubric/export",
      applyAi: APP_URL_V1 + "/user/csms/contract/folder/apply-ai",
      exportAiEvaluation: APP_URL_V1 + "/user/csms/ai-evaluation/export",
    }
  },
  notification: {
    list: APP_URL_V1 + "/user/notification",
    markAll: APP_URL_V1 + "/user/notification/mark-all",
    crud: APP_URL_V1 + "/user/notification",
  }
}