import { create } from "zustand/index";
import { APP_CONFIG } from "@/constants/config";
import { persist } from "zustand/middleware";
import {
  EMPLOYEE_FILE_TYPE,
  EMPLOYEE_RANK_COMPLIANCE_DOC,
  EMPLOYEE_TYPE,
  RANK_HEALTH_OH_IH,
  RANK_HEALTH_TYPE,
  REPORT_TYPE
} from "@/constants/app-enum";
import { date_to_string } from "@/lib/my-utils";

export const defaultStore = {
  hsePerformance: {
    reset: true,
    date_start: date_to_string(new Date()),
    date_end: date_to_string(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    formTypes: Object.keys(REPORT_TYPE),
    basis: "default",
    subtype: [],
    vesselId: []
  },
  csmsDashboard: {
    year: [new Date().getFullYear()],
    contractorId: [],
    page: 0,
    limit: 10
  },
  dailyActivity: {
    reset: true,
    date_start: date_to_string(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    date_end: date_to_string(new Date()),
    formTypes: [REPORT_TYPE.project.value],
    page: 0,
    view: 5,
    showDetails: true,
    instansi: [],
    sort: "reportDate",
    order: "desc",
    search: "",
    subtypes: [],
    vesselId: []
  },
  dailyReportList: {
    reset: true,
    selectByRange: "false",
    date_start: date_to_string(new Date()),
    date_end: date_to_string(new Date()),
    formTypes: Object.keys(REPORT_TYPE),
    page: 0,
    view: 10,
    showDetails: false,
    instansi: [],
    sort: "reportDate",
    order: "desc",
    search: "",
    subtypes: [],
    vesselId: [],
    viewMode: "table"
  },
  employeeList: {
    reset: true,
    selectByRange: "false",
    date_start: date_to_string(new Date()),
    date_end: date_to_string(new Date()),
    search: "",
    category: Object.keys(EMPLOYEE_TYPE),
    subContractorId: [],
    sortBy: "createdAt",
    orderBy: "desc",
    limit: 10,
    page: 0,
    showDetails: true,
    viewMode: "details",
    statusOnDuty: [true, false],
    vesselId: [],
    projectId: [],
    location: [],
    ohihReview: [],
    complianceDocKey: [],
    documentStatus: ""
  },
  employeeDashboard: {
    reset: true,
    years: [new Date().getFullYear()],
    subContractorIds: [],
    category: Object.keys(EMPLOYEE_TYPE),
    requireFile: false,
    fileType: Object.keys(EMPLOYEE_FILE_TYPE).reduce<Record<string, boolean>>((acc, key) => {
      acc[key] = false;
      return acc;
    }, {}),
    rankComplianceDoc: Object.keys(EMPLOYEE_RANK_COMPLIANCE_DOC),
    rankHealthOhih: Object.keys(RANK_HEALTH_OH_IH),
    rankHealthTypes: RANK_HEALTH_TYPE.status.value,
    complianceRate: {
      orderBy: 'desc'
    },
    healthRisk: {
      orderBy: 'desc'
    },
    complianceRank: {
      orderBy: 'desc'
    },
    healthRank: {
      orderBy: 'desc'
    }
  },
  notificationList: {
    reset: true,
    onlyUnread: true,
    orderBy: "desc",
    viewMode: "list"
  },
  attendanceList: {
    reset: true,
    category: ["project", "marine", "mitra"],
    selectByRange: "false",
    search: "",
    status: [],
    date_start: date_to_string(new Date()),
    date_end: date_to_string(new Date()),
    orderBy: "desc",
    limit: 10,
    page: 0,
    projectId: [],
    vesselId: [],
    subContractorId: [],
  },
  contractManagement: {
    viewMode: 'card' as string,
    search: '',
    subContractorId: [] as string[],
    sort: 'updatedAt',
    order: 'desc',
    page: 0,
    view: 10
  },
  contractorVesselList: {
    search: "",
    page: 0,
    limit: 10,
    sort: "name",
    order: "asc",
    viewMode: "table",
    category: ''
  },
  smartCard: {
    dateRange: 'all',
    search: '',
    company: 'all',
    position: '',
    category: 'all',
    date_start: date_to_string(new Date()),
    date_end: date_to_string(new Date()),
    sortBy: 'employeeName',
    orderBy: 'asc',
    limit: 10,
    page: 0,
    view: 'list',
    projectId: 'all',
    vesselId: 'all',
    employeeStatus: 'all'
  },
  adminUserList: {
    page: 0,
    limit: 10,
    search: ""
  },
  contractorList: {
    page: 0,
    limit: 10,
    search: "",
    category: "project,mitra,null"
  },
  pobUnmatchedDetails: {
    filter: 'all',
    sortBy: 'similarity',
    orderBy: 'desc',
    page: 0,
    limit: 5
  }
}

type Store = {
  hsePerformance: {
    reset: boolean,
    date_start: string,
    date_end: string,
    formTypes: string[],
    basis: string,
    subtype: string[],
    vesselId: string[]
  };
  setHsePerformance: (hsePerformance: any) => void;

  csmsDashboard: {
    year: number[],
    contractorId: string[],
    page: number,
    limit: number
  };
  setCsmsDashboard: (csmsDashboard: any) => void;

  dailyActivity: {
    reset: boolean,
    date_start: string,
    date_end: string,
    formTypes: string[],
    page: number,
    view: number,
    showDetails: boolean,
    instansi: string[],
    sort: string,
    order: string,
    search: string,
    subtypes: string[],
    vesselId: string[]
  };
  setDailyActivity: (dailyActivity: any) => void;

  dailyReportList: {
    reset: boolean,
    selectByRange: string,
    date_start: string,
    date_end: string,
    formTypes: string[],
    page: number,
    view: number,
    showDetails: boolean,
    instansi: string[],
    sort: string,
    order: string,
    search: string,
    subtypes: string[],
    vesselId: string[],
    viewMode: string
  }
  setDailyReportList: (dailyReportList: any) => void;

  employeeList: {
    reset: boolean,
    selectByRange: string,
    date_start: string,
    date_end: string,
    search: string,
    category: string[],
    subContractorId: string[],
    sortBy: string,
    orderBy: string,
    limit: number,
    page: number,
    showDetails: boolean,
    viewMode: string,
    statusOnDuty: boolean[],
    vesselId: string[],
    projectId: string[],
    location: string[],
    ohihReview: string[],
    complianceDocKey: string[],
    documentStatus: string
  };
  setEmployeeList: (employeeList: any) => void;

  employeeDashboard: {
    reset: boolean,
    years: number[],
    subContractorIds: string[],
    category: string[],
    requireFile: boolean,
    fileType: Record<string, boolean>,
    rankComplianceDoc: string[],
    rankHealthOhih: string[],
    rankHealthTypes: string,
    complianceRate: {
      orderBy: string
    },
    healthRisk: {
      orderBy: string
    },
    complianceRank: {
      orderBy: string
    },
    healthRank: {
      orderBy: string
    }
  };
  setEmployeeDashboard: (employeeDashboard: any) => void;

  notificationList: {
    reset: boolean,
    onlyUnread: boolean,
    orderBy: string,
    viewMode: string // Add viewMode type
  };
  setNotificationList: (notificationList: any) => void;

  attendanceList: {
    reset: boolean;
    category: string[];
    selectByRange: string;
    search: string;
    status: string[];
    date_start: string;
    date_end: string;
    orderBy: string;
    limit: number;
    page: number;
    projectId: string[];
    vesselId: string[];
    subContractorId: string[];
  };
  setAttendanceList: (attendanceList: any) => void;

  contractManagement: {
    viewMode: string,
    search: string,
    subContractorId: string[],
    sort: string,
    order: string,
    page: number,
    view: number
  }
  setContractManagement: (contractManagement: any) => void;

  contractorVesselList: {
    search: string,
    page: number,
    limit: number,
    sort: string,
    order: string,
    viewMode: string,
    category: string
  };
  setContractorVesselList: (contractorVesselList: any) => void;

  smartCard: {
    dateRange: string,
    search: string,
    company: string,
    position: string,
    category: string,
    date_start: string,
    date_end: string,
    sortBy: string,
    orderBy: string,
    limit: number,
    page: number,
    view: string,
    projectId: string,
    vesselId: string,
    employeeStatus?: string
  }
  setSmartCard: (smartCard: any) => void;

  adminUserList: {
    page: number,
    limit: number,
    search: string
  };
  setAdminUserList: (adminUserList: any) => void;

  contractorList: {
    page: number,
    limit: number,
    search: string,
    category: string
  };
  setContractorList: (contractorList: any) => void;

  pobUnmatchedDetails: {
    filter: string;
    sortBy: string;
    orderBy: string;
    page: number;
    limit: number;
  };
  setPobUnmatchedDetails: (pobUnmatchedDetails: any) => void;

  resetAll: () => void;
}

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      hsePerformance: defaultStore.hsePerformance,
      setHsePerformance: (hsePerformance: any) => set({ hsePerformance }),

      csmsDashboard: defaultStore.csmsDashboard,
      setCsmsDashboard: (csmsDashboard: any) => set({ csmsDashboard }),

      dailyActivity: defaultStore.dailyActivity,
      setDailyActivity: (dailyActivity: any) => set({ dailyActivity }),

      dailyReportList: defaultStore.dailyReportList,
      setDailyReportList: (dailyReportList: any) => set({ dailyReportList }),

      employeeList: defaultStore.employeeList,
      setEmployeeList: (employeeList: any) => set({ employeeList }),

      employeeDashboard: defaultStore.employeeDashboard,
      setEmployeeDashboard: (employeeDashboard: any) => set({ employeeDashboard }),

      notificationList: defaultStore.notificationList,
      setNotificationList: (notificationList: any) => set({ notificationList }),

      attendanceList: defaultStore.attendanceList,
      setAttendanceList: (attendanceList: any) => set({ attendanceList }),

      contractManagement: defaultStore.contractManagement,
      setContractManagement: (contractManagement: any) => set({ contractManagement }),

      contractorVesselList: defaultStore.contractorVesselList,
      setContractorVesselList: (contractorVesselList: any) => set({ contractorVesselList }),

      smartCard: defaultStore.smartCard,
      setSmartCard: (smartCard: any) => set({ smartCard }),

      adminUserList: defaultStore.adminUserList,
      setAdminUserList: (adminUserList: any) => set({ adminUserList }),

      contractorList: defaultStore.contractorList,
      setContractorList: (contractorList: any) => set({ contractorList }),

      pobUnmatchedDetails: defaultStore.pobUnmatchedDetails,
      setPobUnmatchedDetails: (pobUnmatchedDetails: any) => set({ pobUnmatchedDetails }),

      resetAll: () => set({
        hsePerformance: defaultStore.hsePerformance,
        csmsDashboard: defaultStore.csmsDashboard,
        dailyActivity: defaultStore.dailyActivity,
        dailyReportList: defaultStore.dailyReportList,
        employeeList: defaultStore.employeeList,
        employeeDashboard: defaultStore.employeeDashboard,
        notificationList: defaultStore.notificationList,
        attendanceList: defaultStore.attendanceList,
        contractManagement: defaultStore.contractManagement,
        contractorVesselList: defaultStore.contractorVesselList,
        smartCard: defaultStore.smartCard,
        adminUserList: defaultStore.adminUserList,
        contractorList: defaultStore.contractorList,
        pobUnmatchedDetails: defaultStore.pobUnmatchedDetails,
      }),
    }),
    {
      name: `${APP_CONFIG.prefixStore}-app`, // single storage key
    }
  )
);