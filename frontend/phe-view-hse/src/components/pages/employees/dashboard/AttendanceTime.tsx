import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useAppTranslation } from "@/lib/i18n-typed";

interface AttendanceTimeProps {
    currentTime: Date;
}

export const AttendanceTime = ({ currentTime }: AttendanceTimeProps) => {
    const { t } = useAppTranslation();

    const formatDate = (date: Date) => {
        return format(date, 'EEEE, d MMMM yyyy', { locale: id })
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <div className="text-xs text-slate-500 mb-2">{t($ => $.employeesAttendance.timeDescription)}</div>
            <div className="text-5xl font-bold text-[#1e4a8f] font-mono tracking-tighter">
                {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm text-slate-500 mt-1">
                {formatDate(currentTime)}
            </div>
        </div>
    )
}
