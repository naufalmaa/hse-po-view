import { useAppTranslation } from "@/lib/i18n-typed";

interface AttendanceStatsProps {
    checkInTime: string;
    checkInClass: string;
    checkOutTime: string;
    checkOutClass: string;
}

export const AttendanceStats = ({ checkInTime, checkInClass, checkOutTime, checkOutClass }: AttendanceStatsProps) => {
    const { t } = useAppTranslation();
    return (
        <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                <div className="text-[10px] text-slate-500 mb-1">{t($ => $.employeesAttendance.checkInStats)}</div>
                <div className={`text-2xl font-bold ${checkInClass}`}>{checkInTime}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                <div className="text-[10px] text-slate-500 mb-1">{t($ => $.employeesAttendance.checkOutStats)}</div>
                <div className={`text-2xl font-bold ${checkOutClass}`}>{checkOutTime}</div>
            </div>
        </div>
    )
}
