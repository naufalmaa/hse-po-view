export const AppRoute = {
    auth: {
        signUp: {
            url: "/sign-up",
            breadcrumb: []
        },
        signIn: {
            url: "/login",
            breadcrumb: []
        },
        forgotPassword: {
            url: "/forgot-password",
            breadcrumb: []
        },
        resetPassword: {
            url: "/reset-password",
            breadcrumb: []
        },
        signInEmployee: {
            url: "/login-employee",
            breadcrumb: []
        }
    },
    employeeUser: {
        dashboard: {
            url: "/employees/dashboard",
            breadcrumb: []
        },
        attendance: {
            url: "/employees/attendance",
            breadcrumb: []
        },
        attendanceHistory: {
            url: "/employees/attendance-history",
            breadcrumb: []
        }
    },
    user: {
        profile: {
            url: "/user/profile",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "User Profile", url: "/user/profile" }
            ]
        },
    },
    dashboard: {
        hsePerformance: {
            url: "/hse-performance",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" }
            ]
        },
    },
    admin: {
        csmsAi: {
            url: "/admin/csms-ai",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "AI CSMS", url: "/admin/csms-ai" }
            ]
        },
        user: {
            list: {
                url: "/admin/users",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Users", url: "/admin/users" }
                ]
            }
        }
    },
    report: {
        dailyReport: {
            list: {
                url: "/daily-report/list",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Daily Report", url: "/daily-report/list" }
                ]
            },
            create: {
                url: "/daily-report/create",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Daily Report", url: "/daily-report/list" },
                    { title: "Create Report", url: "/daily-report/create" }
                ]
            },
            edit: {
                url: "/daily-report/edit",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Daily Report", url: "/daily-report/list" },
                    { title: "Edit Report", url: "/daily-report/edit" }
                ]
            },
        },
        dailyActivity: {
            summary: {
                url: "/daily-activity/summary",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Daily Activity", url: "/daily-activity/summary" }
                ]
            },
        }
    },
    dataManagement: {
        vessel: {
            list: {
                url: "/vessels",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Contractor Vessels", url: "/contractor-vessels" },
                    { title: "Vessels", url: "/vessels" }
                ]
            },
        },
        subTypes: {
            list: {
                url: "/sub-types",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Sub Types", url: "/sub-types" }
                ]
            },
        },
        contractor: {
            list: {
                url: "/contractors",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Contractors", url: "/contractors" }
                ]
            },
        },
        contractorVessel: {
            list: {
                url: "/contractor-vessels",
                breadcrumb: [
                    { title: "Dashboard", url: "/hse-performance" },
                    { title: "Contractor Vessels", url: "/contractor-vessels" }
                ]
            },
        },
    },
    csms: {
        dashboard: {
            url: "/csms/dashboard",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "CSMS Dashboard", url: "/csms/dashboard" }
            ]
        },
        guidelines: {
            url: "/csms/guidelines",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "CSMS", url: "/csms/dashboard" },
                { title: "Guidelines", url: "/csms/guidelines" }
            ]
        },
        qualification: {
            url: "/csms/qualification",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "CSMS", url: "/csms/dashboard" },
                { title: "Qualification", url: "/csms/qualification" }
            ]
        },
        contracts: {
            url: "/csms/contracts/contract-list",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "CSMS", url: "/csms/dashboard" },
                { title: "Contracts", url: "/csms/contracts/contract-list" }
            ]
        },
        contractManagement: {
            url: "/csms/contract-management",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "CSMS", url: "/csms/dashboard" },
                { title: "Contract Management", url: "/csms/contract-management" }
            ]
        },
        contractManagementDetails: {
            url: "/csms/contract-details",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "CSMS", url: "/csms/dashboard" },
                { title: "Contract Management", url: "/csms/contract-management" },
                { title: "Contract Details", url: "/csms/contract-details" }
            ]
        }
    },
    employee: {
        dashboard: {
            url: "/employee/dashboard",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "Dashboard Pekerja", url: "/employee/dashboard" }
            ]
        },
        list: {
            url: "/employee/list",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "Pekerja", url: "/employee/list" }
            ]
        },
        detail: {
            url: "/employee/detail",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "Pekerja", url: "/employee/list" },
                { title: "Detail Pekerja", url: "/employee/detail" }
            ]
        },
        smartCard: {
            url: "/employee/smart-card",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "Smart Card", url: "/employee/smart-card" },
            ]
        },
        employeeAttendance: {
            url: "/employee/attendance-list",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "Absensi Pekerja", url: "/employee/attendance-list" }
            ]
        },
        attendanceDetails: {
            url: "/employee/attendance",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "Absensi Pekerja", url: "/employee/attendance-list" },
                { title: "Detail Absensi", url: "/employee/attendance" }
            ]
        },
        pobUnmatchedLogs: {
            url: "/employee/pob-unmatched-logs",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "POB Absensi", url: "/employee/pob-update" },
                { title: "POB Unmatched Logs", url: "/employee/pob-unmatched-logs" }
            ]
        },
        pobUnmatchedDetails: {
            url: "/employee/pob-unmatched-details",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "POB Absensi", url: "/employee/pob-update" },
                { title: "POB Unmatched Logs", url: "/employee/pob-unmatched-logs" },
                { title: "Detail", url: "/employee/pob-unmatched-details" }
            ]
        },
        smartCardUpload: {
            url: "/employee/smart-card-upload",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "Smart Card", url: "/employee/smart-card" },
                { title: "Upload", url: "/employee/smart-card-upload" }
            ]
        },
        smartCardValidation: {
            url: "/employee/smart-card-validation",
            breadcrumb: [
                { title: "Dashboard", url: "/employee/dashboard" },
                { title: "Smart Card", url: "/employee/smart-card" },
                { title: "Validation", url: "/employee/smart-card-validation" }
            ]
        },
    },
    notification: {
        list: {
            url: "/notification/list",
            breadcrumb: [
                { title: "Dashboard", url: "/hse-performance" },
                { title: "Notifications", url: "/notification/list" }
            ]
        },
    }
}