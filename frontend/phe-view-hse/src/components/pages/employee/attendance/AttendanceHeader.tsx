import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeWithAttendance } from "@/service/employee/attendance-list";
import { useAppTranslation } from "@/lib/i18n-typed";
import { LuMapPin, LuBriefcase, LuUser, LuClock, LuExternalLink } from "react-icons/lu";
import { string_date_formatted } from "@/lib/my-utils";
import { Link } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";

type Props = {
    employee: EmployeeWithAttendance;
}

export const AttendanceHeader = ({ employee }: Props) => {
    const { t } = useAppTranslation();

    const getStatusBadge = (status: boolean) => {
        return (
            <Badge
                variant={"outline"}
                className="gap-1.5"
                style={{ fontSize: '12px', padding: '4px 10px', height: '24px' }}
            >
                <span className={`w-2 h-2 rounded-full ${status ? "bg-green-500" : "bg-red-500"}`} />
                {status ? t($ => $.attendance.employeeInfo.status.onDuty) : t($ => $.attendance.employeeInfo.status.offDuty)}
            </Badge>
        );
    };

    return (
        <Card className="shadow-sm border-border bg-card">
            <CardContent className="px-6">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <Avatar className="h-24 w-24 border-2 border-border shrink-0">
                        <AvatarImage src={employee.imageUrl} alt={employee.employeeName} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                            {employee.employeeName?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h2 className="text-2xl font-bold text-foreground">{employee.employeeName}</h2>
                                    {getStatusBadge(employee.statusOnDuty)}
                                </div>
                                <div className="text-muted-foreground flex items-center gap-2">
                                    <LuBriefcase className="w-4 h-4" />
                                    <span>{employee.position || "No Position"}</span>
                                    <span className="mx-2">•</span>
                                    <LuUser className="w-4 h-4" />
                                    <span>{employee.category || "-"}</span>
                                </div>
                            </div>

                            <Button variant="outline" size="sm" asChild className="gap-2 shrink-0 self-start sm:self-center shadow-sm hover:bg-primary/10 hover:text-primary transition-all">
                                <Link to={AppRoute.employee.detail.url} search={{ id: employee.id } as any}>
                                    <LuExternalLink className="w-4 h-4" />
                                    <span>Detail Pekerja</span>
                                </Link>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs uppercase text-muted-foreground font-medium">{t($ => $.attendance.employeeInfo.vessel)}</span>
                                <span className="font-medium">{employee.vesselName || employee.projectName || "-"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs uppercase text-muted-foreground font-medium">{t($ => $.attendanceList.attendanceList.passport)}</span>
                                <span className="font-medium">{employee.hssePassportNumber || "-"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs uppercase text-muted-foreground font-medium">{t($ => $.attendance.employeeInfo.lastUpdate)}</span>
                                <div className="flex items-center gap-2">
                                    <LuClock className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>{string_date_formatted({ localeId: 'id', dateString: employee.updatedAt, format: 'dd-MM-yyyy HH:mm' })}</span>
                                </div>
                            </div>
                            {employee.location && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs uppercase text-muted-foreground font-medium">{t($ => $.attendance.history.location)}</span>
                                    <div className="flex items-center gap-2">
                                        <LuMapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="truncate max-w-[200px]" title={employee.location}>{employee.location}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
