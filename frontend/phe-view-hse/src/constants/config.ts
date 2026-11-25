import AppLogo from "@/assets/app/favicon.png";
import { AppRoute } from "./app-route";
// Demo build (vite --mode demo) is branded SafeView; every other build keeps the original PO-View branding.
const IS_DEMO = import.meta.env.VITE_APP_VARIANT === "demo";

export const APP_CONFIG = {
  prefixStore: "hse",
  isDev: false,
  dayFormat: "yyyy-MM-dd",
  app: {
    name: IS_DEMO ? "SafeView" : "PO-View",
    description: "HSE Performance",
    logo: IS_DEMO ? "/brand/safeview/favicon.svg" : AppLogo,
    loginLogo: IS_DEMO ? "/brand/safeview/logo-light.svg" : "/images/pheview-hse.png",
    isDemo: IS_DEMO,
    version: "1.0.0",
  },
  demoUser: {
    email: "",
    password: "",
  },
  path: {
    defaultPublic: AppRoute.auth.signIn.url,
    defaultPrivate: AppRoute.dashboard.hsePerformance.url,
    defaultContractor: AppRoute.report.dailyReport.list.url,
    defaultCrew: AppRoute.report.dailyReport.list.url,
    defaultAuditor: AppRoute.dashboard.hsePerformance.url,
    employeeLogin: AppRoute.auth.signInEmployee.url,
    defaultEmployee: AppRoute.employeeUser.dashboard.url,
  },
  id: {
    pheOsesId: "4861d25a-2c31-417e-bb55-277251606f8d"
  }
}