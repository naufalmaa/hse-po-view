
import { Card, CardContent } from "@/components/ui/card";
import { Users, ClipboardList } from "lucide-react";
import { AttendanceListMeta } from "@/service/employee/attendance-list";
import { cn } from "@/lib/utils";
import { useAppTranslation } from "@/lib/i18n-typed";

interface StatsCardsProps {
    meta?: AttendanceListMeta;
    isLoading: boolean;
}

export default function StatsCards({ meta, isLoading }: StatsCardsProps) {
    const { t } = useAppTranslation();

    const stats = [
        {
            title: t($ => $.attendanceList.attendanceList.totalEmployees),
            value: meta?.totalEmployees || 0,
            icon: Users,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-200 dark:border-blue-800",
            gradient: "from-blue-50 to-white dark:from-blue-950/20 dark:to-background"
        },
        {
            title: t($ => $.attendanceList.attendanceList.totalAttendance),
            value: meta?.totalAttendanceRecords || 0,
            icon: ClipboardList,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-200 dark:border-emerald-800",
            gradient: "from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background"
        }
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[1, 2].map((i) => (
                    <div key={i} className="h-28 bg-muted/50 animate-pulse rounded-xl border border-border/50" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {stats.map((stat, index) => (
                <Card
                    key={index}
                    className={cn(
                        "relative overflow-hidden border shadow-sm transition-all duration-200 hover:shadow-md",
                        stat.borderColor
                    )}
                >
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", stat.gradient)} />
                    <CardContent className="relative px-6 flex items-center justify-between z-10">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-bold tracking-tight">{stat.value.toLocaleString('id-ID')}</h3>
                            </div>
                        </div>
                        <div className={cn("p-4 rounded-xl shadow-sm", stat.bgColor)}>
                            <stat.icon className={cn("w-6 h-6", stat.color)} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
