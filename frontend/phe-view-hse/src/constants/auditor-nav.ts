import { MdOutlineDashboard } from "react-icons/md";
import { AppRoute } from "./app-route";
import { GoFileDirectory, GoTasklist } from "react-icons/go";
import { AiOutlineDashboard } from "react-icons/ai";

export const AuditorNav = {
    user: {},
    teams: {},
    navGroups: [
        {
            title: "MONITOR",
            items: [
                {
                    title: "HSE Performance",
                    url: AppRoute.dashboard.hsePerformance.url,
                    icon: MdOutlineDashboard,
                },
            ]
        },
        {
            title: "CSMS",
            icon: GoFileDirectory,
            items: [
                {
                    title: "Dashboard",
                    url: AppRoute.csms.dashboard.url,
                    icon: AiOutlineDashboard,
                },
                {
                    title: "Contracts",
                    url: AppRoute.csms.contracts.url,
                    icon: GoTasklist,
                }
            ]
        }
    ]
}