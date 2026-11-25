import { useAppTranslation } from "@/lib/i18n-typed";
import { Clock, ExternalLink, FileText, Image as ImageIcon, MapPin, Calendar } from "lucide-react";
import { AttendanceCycle } from "@/components/pages/employee/attendance/AttendanceHistory";
import { LongText } from "@/components/custom/components";
import { string_date_formatted } from "@/lib/my-utils";
import { cn } from "@/lib/utils";

interface AttendanceHistoryCardProps {
    cycle: AttendanceCycle;
}

export const AttendanceHistoryCard = ({ cycle }: AttendanceHistoryCardProps) => {
    const { t } = useAppTranslation();
    const hasOff = !!cycle.offDuty;
    const od = cycle.onDuty;
    const fd = cycle.offDuty;

    const odLocationDisplay = od.locationAttendanceName === '-'
        ? t($ => $.attendance.history.locationNotFound)
        : (od.locationAttendanceName || od.locationName || "-");

    const fdLocationDisplay = fd ? (fd.locationAttendanceName === '-'
        ? t($ => $.attendance.history.locationNotFound)
        : (fd.locationAttendanceName || fd.locationName || "-")) : "-";

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
            {/* Header */}
            <div className="p-4 border-b border-slate-50 flex justify-between items-center gap-3 bg-slate-50/50">
                <div className="flex gap-2 items-center">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">
                        {string_date_formatted({ localeId: "id-ID", dateString: od?.attendanceDate, format: "MMMM dd, yyyy" }) || "-"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                        hasOff
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-green-100 text-green-600 border-green-200 animate-pulse"
                    )}>
                        {hasOff ? t($ => $.attendance.history.cycleFinished) : t($ => $.attendance.history.cycleActive)}
                    </span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 border border-blue-200">
                        {cycle.daysOnBoard ? `${cycle.daysOnBoard} ${t($ => $.attendance.days)}` : "—"}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-6">
                {/* ON DUTY (Check-in) */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-dashed border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <h4 className="font-bold text-xs text-green-600 uppercase tracking-wide">
                            {t($ => $.attendance.history.onDutyCheckIn)}
                        </h4>
                    </div>

                    {!(od as any).isSynthetic ? (
                        <div className="space-y-2.5">
                            {/* Time */}
                            <div className="flex gap-2.5 items-center text-xs text-slate-500">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                    {t($ => $.attendance.history.inputTime)}: {string_date_formatted({ localeId: 'id', dateString: od.createdAt, format: 'dd-MM-yyyy HH:mm' }) || "-"}
                                </span>
                            </div>

                            {/* Location */}
                            <div className="flex gap-2.5 items-start">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                <div className="text-xs text-slate-600 flex-1">
                                    <span className="block text-[10px] text-slate-400 mb-0.5">{t($ => $.attendance.history.checkInLocation)}</span>
                                    <div className="font-medium text-slate-950">{odLocationDisplay}</div>
                                    {od.locationAttendance && typeof od.locationAttendance === 'object' && (od.locationAttendance as any).latitude && (od.locationAttendance as any).longitude && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${(od.locationAttendance as any).latitude},${(od.locationAttendance as any).longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-primary hover:underline font-mono mt-1 inline-block bg-slate-50 px-1 rounded border border-slate-100"
                                        >
                                            {(od.locationAttendance as any).latitude}, {(od.locationAttendance as any).longitude}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            {od.notes && (
                                <div className="flex gap-2.5 items-start">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                    <div className="text-xs text-slate-600 flex-1">
                                        <span className="block text-[10px] text-slate-400 mb-0.5">{t($ => $.employeesAttendance.detail.notes)}</span>
                                        <div className="bg-slate-50 p-2 rounded-lg text-slate-700 italic border border-slate-100">
                                            <LongText text={od.notes} maxChars={150} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Evidence */}
                            {od.photoEvidence && (
                                <div className="flex gap-2.5 items-start">
                                    <ImageIcon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                    <div className="text-xs text-slate-600 flex-1">
                                        <a
                                            href={od.photoEvidence}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors w-fit text-[11px] font-medium"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>{t($ => $.employeesAttendance.detail.viewPhoto)}</span>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic pl-4">{t($ => $.attendance.history.noCheckIn)}</p>
                    )}
                </div>

                {/* OFF DUTY (Check-out) */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 pb-1 border-b border-dashed border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <h4 className="font-bold text-xs text-red-600 uppercase tracking-wide">
                            {t($ => $.attendance.history.offDutyCheckOut)}
                        </h4>
                    </div>

                    {fd ? (
                        <div className="space-y-2.5">
                            {/* Time */}
                            <div className="flex gap-2.5 items-center text-xs text-slate-500">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                    {t($ => $.attendance.history.inputTime)}: {string_date_formatted({ localeId: 'id', dateString: fd.createdAt, format: 'dd-MM-yyyy HH:mm' }) || "-"}
                                </span>
                            </div>

                            {/* Location */}
                            <div className="flex gap-2.5 items-start">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                <div className="text-xs text-slate-600 flex-1">
                                    <span className="block text-[10px] text-slate-400 mb-0.5">{t($ => $.attendance.history.checkOutLocation)}</span>
                                    <div className="font-medium text-slate-950">{fdLocationDisplay}</div>
                                    {fd.locationAttendance && typeof fd.locationAttendance === 'object' && (fd.locationAttendance as any).latitude && (fd.locationAttendance as any).longitude && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${(fd.locationAttendance as any).latitude},${(fd.locationAttendance as any).longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-primary hover:underline font-mono mt-1 inline-block bg-slate-50 px-1 rounded border border-slate-100"
                                        >
                                            {(fd.locationAttendance as any).latitude}, {(fd.locationAttendance as any).longitude}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            {fd.notes && (
                                <div className="flex gap-2.5 items-start">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                    <div className="text-xs text-slate-600 flex-1">
                                        <span className="block text-[10px] text-slate-400 mb-0.5">{t($ => $.employeesAttendance.detail.notes)}</span>
                                        <div className="bg-slate-50 p-2 rounded-lg text-slate-700 italic border border-slate-100">
                                            <LongText text={fd.notes} maxChars={150} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Evidence */}
                            {fd.photoEvidence && (
                                <div className="flex gap-2.5 items-start">
                                    <ImageIcon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                    <div className="text-xs text-slate-600 flex-1">
                                        <a
                                            href={fd.photoEvidence}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors w-fit text-[11px] font-medium"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>{t($ => $.employeesAttendance.detail.viewPhoto)}</span>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic pl-4">{t($ => $.attendance.history.noCheckOut)}</p>
                    )}
                </div>
            </div>
        </div>
    );
};
