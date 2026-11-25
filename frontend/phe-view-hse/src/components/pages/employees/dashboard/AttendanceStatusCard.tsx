import { useAppTranslation } from "@/lib/i18n-typed";
import { ExternalLink } from "lucide-react";

import { Attendance } from "@/service/employees/attendance-list";
import { LongText } from "@/components/custom/components/LongText";
import { string_date_formatted } from "@/lib/my-utils";

interface AttendanceStatusCardProps {
    statusClass: string;
    statusText: string;
    currentText: string;
    data?: Attendance | null;
}

export const AttendanceStatusCard = ({
    statusClass,
    statusText,
    currentText,
    data
}: AttendanceStatusCardProps) => {
    const { t } = useAppTranslation();

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-base">{t($ => $.employeesAttendance.statusTitle)}</h3>
                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${statusClass}`}>
                    {statusText}
                </span>
            </div>
            <div className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">{t($ => $.employeesAttendance.dateLabel)}</span>
                    <span className="text-sm font-semibold">{string_date_formatted({ localeId: "id-ID", dateString: data?.attendanceDate, format: "MMMM dd, yyyy" })}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">{t($ => $.employeesAttendance.statusLabel)}</span>
                    <span className="text-sm font-semibold">{currentText}</span>
                </div>

                {data && (
                    <>
                        <div className="border-t border-slate-100 my-3"></div>

                        {/* <div className="flex justify-between items-start">
                            <span className="text-sm text-slate-500">{t($ => $.employeesAttendance.detail.location)}</span>
                            <span className="text-sm font-semibold text-right max-w-[60%] truncate">
                                {data.locationName || t($ => $.employeesAttendance.detail.noData)}
                            </span>
                        </div> */}

                        {data.locationAttendance && (
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-slate-500">{t($ => $.employeesAttendance.detail.coordinate)}</span>
                                <span className="text-sm font-semibold text-right text-xs bg-slate-50 px-2 py-1 rounded">
                                    {data.locationAttendance?.latitude}, {data.locationAttendance?.longitude}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">{t($ => $.employeesAttendance.detail.daysOnBoard)}</span>
                            <span className="text-sm font-semibold">
                                {data.daysOnBoard ? `${data.daysOnBoard} ${t($ => $.employeesAttendance.detail.days)}` : "-"}
                            </span>
                        </div>

                        {data.notes && (
                            <div className="flex flex-col gap-1 pt-1">
                                <span className="text-sm text-slate-500">{t($ => $.employeesAttendance.detail.notes)}</span>
                                <div className="text-sm bg-slate-50 p-2 rounded-lg text-slate-700">
                                    <LongText text={data.notes} maxChars={150} />
                                </div>
                            </div>
                        )}

                        {data.photoEvidence && (
                            <div className="flex flex-col gap-2 pt-1">
                                <span className="text-sm text-slate-500">{t($ => $.employeesAttendance.detail.evidence)}</span>
                                <a
                                    href={data.photoEvidence}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative rounded-lg overflow-hidden border border-slate-200 block"
                                >
                                    <img
                                        src={data.photoEvidence}
                                        alt="Evidence"
                                        className="w-full h-auto max-h-[150px] object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="bg-white/90 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ExternalLink className="w-4 h-4 text-slate-700" />
                                        </div>
                                    </div>
                                </a>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
