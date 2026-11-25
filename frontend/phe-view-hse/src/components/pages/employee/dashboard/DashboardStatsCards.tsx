import { LuUsers, LuUserCheck, LuFileCheck, LuHeartPulse, LuTrendingUp, LuActivity } from "react-icons/lu";
import { useAppTranslation } from "@/lib/i18n-typed";
import { to_decimal_formatted } from "@/lib/my-utils";
import { EmployeeDashboardData } from "@/service/employee/employee-dashboard";

interface DashboardStatsCardsProps {
    dashboardData: EmployeeDashboardData | null;
    baseFilters?: any;
}

import { useNavigate } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";

export default function DashboardStatsCards({ dashboardData, baseFilters }: DashboardStatsCardsProps) {
    const { t } = useAppTranslation();
    const navigate = useNavigate();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Employees Card */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-blue-50 font-medium text-sm">{t($ => $.employee.dashboard.stats.totalEmployees)}</h3>
                            <p className="text-2xl font-bold text-white mt-1">
                                {to_decimal_formatted(dashboardData?.totalEmployees ?? 0, 0)}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-400/30 rounded-lg">
                            <LuUsers className="h-6 w-6 text-blue-50" />
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <LuTrendingUp className="h-4 w-4 mr-1 text-blue-500" />
                        {t($ => $.employee.dashboard.stats.activeWorkforceCount)}
                    </div>
                </div>
            </div>

            {/* Employees On Duty Card */}
            <div
                className="bg-card rounded-xl shadow-sm border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate({ 
                    to: AppRoute.employee.list.url, 
                    search: { 
                        ...baseFilters,
                        statusOnDuty: 'true' 
                    } as any
                })}
            >
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-purple-50 font-medium text-sm">{t($ => $.employee.dashboard.stats.employeesOnDuty)}</h3>
                            <p className="text-2xl font-bold text-white mt-1">
                                {to_decimal_formatted(dashboardData?.employeesOnDuty ?? 0, 0)}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-400/30 rounded-lg">
                            <LuUserCheck className="h-6 w-6 text-purple-50" />
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <LuActivity className="h-4 w-4 mr-1 text-purple-500" />
                        {t($ => $.employee.dashboard.stats.currentlyActiveWorkers)}
                    </div>
                </div>
            </div>

            {/* Document Compliance Card */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-orange-50 font-medium text-sm">{t($ => $.employee.dashboard.stats.documentCompliance)}</h3>
                            <p className="text-2xl font-bold text-white mt-1">
                                {to_decimal_formatted(
                                    typeof dashboardData?.overallCompliancePct === 'object'
                                        ? (dashboardData?.overallCompliancePct as any)?.pct ?? 0
                                        : dashboardData?.overallCompliancePct ?? 0
                                )}%
                            </p>
                        </div>
                        <div className="p-3 bg-orange-400/30 rounded-lg">
                            <LuFileCheck className="h-6 w-6 text-orange-50" />
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <LuTrendingUp className="h-4 w-4 mr-1 text-orange-500" />
                        {t($ => $.employee.dashboard.stats.overallCompletionRate)}
                    </div>
                </div>
            </div>

            {/* Health Risk Rate Card */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-green-50 font-medium text-sm">{t($ => $.employee.dashboard.stats.healthRiskRate)}</h3>
                            <p className="text-2xl font-bold text-white mt-1">
                                {to_decimal_formatted(dashboardData?.overallHealthRiskAboveP3Pct.pct ?? 0)}%
                            </p>
                        </div>
                        <div className="p-3 bg-green-400/30 rounded-lg">
                            <LuHeartPulse className="h-6 w-6 text-green-50" />
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <LuTrendingUp className="h-4 w-4 mr-1 text-green-500" />
                        {t($ => $.employee.dashboard.stats.aboveP3Threshold)}
                    </div>
                </div>
            </div>
        </div>
    );
}
