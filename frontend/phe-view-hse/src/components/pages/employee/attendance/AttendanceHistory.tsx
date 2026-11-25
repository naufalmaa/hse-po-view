import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { FaMapMarkerAlt, FaEdit, FaPlus } from 'react-icons/fa';
import { Badge } from "@/components/ui/badge";
import { Attendance } from "@/service/employee/attendance-list";
import { useAppTranslation, AppTranslation } from "@/lib/i18n-typed";
import { string_date_formatted } from "@/lib/my-utils";
import { LuMapPin, LuImage, LuCalendar, LuClock, LuUnlink } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTablePagination } from "@/components/custom/table";
import { cn } from "@/lib/utils";
import { LongText } from "@/components/custom/components";
import { CreateAttendanceDialog } from "./CreateAttendanceDialog";
import { EditAttendanceDialog } from "./EditAttendanceDialog";

const InfoRow = ({ icon: Icon, label, value, valueClassName, onClick }: any) => (
    <div className="flex items-start gap-3 text-sm">
        <div className="rounded-md border border-border/50 bg-background p-1.5 shadow-sm">
            <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="space-y-0.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn("font-medium text-foreground text-xs sm:text-sm", valueClassName, onClick && "cursor-pointer hover:underline")} onClick={onClick}>
                {value}
            </p>
        </div>
    </div>
);

type Props = {
    attendanceHistory: Attendance[];
    paginationData: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    onPaginationChange: (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => void;
    employeeId: string;
    currentStatusOnDuty: boolean;
    onSuccess: () => void;
    employee?: any;
}

export interface AttendanceCycle {
    id: string; // unique ID representing cycle (usually onDuty id)
    onDuty: Attendance;
    offDuty?: Attendance;
    daysOnBoard?: number;
}

// Group flat records into On Duty - Off Duty cycles
export const groupAttendanceToCycles = (history: Attendance[]): AttendanceCycle[] => {
    // Sort history by attendanceDate/createdAt ascending to pair chronologically
    const sorted = [...history].sort((a, b) => {
        const dateA = a.attendanceDate || new Date(a.createdAt).toISOString().slice(0, 10);
        const dateB = b.attendanceDate || new Date(b.createdAt).toISOString().slice(0, 10);
        if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const cycles: AttendanceCycle[] = [];
    let currentCycle: AttendanceCycle | null = null;

    for (const record of sorted) {
        const isRecordOnDuty = record.statusAfter === 'on_duty' || record.statusAfter === 'On Duty';

        if (isRecordOnDuty) {
            if (currentCycle) {
                // Unclosed cycle: calculate days until next on_duty or today
                const startStr = (currentCycle.onDuty.attendanceDate || currentCycle.onDuty.createdAt).slice(0, 10);
                const endStr = (record.attendanceDate || record.createdAt).slice(0, 10);
                const start = new Date(startStr);
                const end = new Date(endStr);
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
                currentCycle.daysOnBoard = diffDays > 0 ? diffDays : 1;
                cycles.push(currentCycle);
            }
            currentCycle = {
                id: record.id,
                onDuty: record
            };
        } else {
            // Off Duty record
            if (currentCycle && !currentCycle.offDuty) {
                currentCycle.offDuty = record;
                const startStr = (currentCycle.onDuty.attendanceDate || currentCycle.onDuty.createdAt).slice(0, 10);
                const endStr = (record.attendanceDate || record.createdAt).slice(0, 10);
                const start = new Date(startStr);
                const end = new Date(endStr);
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
                currentCycle.daysOnBoard = diffDays > 0 ? diffDays : 1;
                cycles.push(currentCycle);
                currentCycle = null;
            } else {
                // Unpaired off duty (orphan record)
                cycles.push({
                    id: record.id,
                    onDuty: {
                        ...record,
                        statusAfter: 'on_duty',
                        attendanceDate: '',
                        notes: 'Missing Check-In Data',
                        isSynthetic: true,
                    } as any,
                    offDuty: record,
                    daysOnBoard: 0
                });
            }
        }
    }

    if (currentCycle) {
        // Active/ongoing cycle
        const startStr = (currentCycle.onDuty.attendanceDate || currentCycle.onDuty.createdAt).slice(0, 10);
        const start = new Date(startStr);
        const end = new Date(new Date().toISOString().slice(0, 10));
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        currentCycle.daysOnBoard = diffDays > 0 ? diffDays : 1;
        cycles.push(currentCycle);
    }

    // Return in descending order (newest cycle first)
    return cycles.reverse();
};

const customMarkerIcon = L.divIcon({
    className: 'custom-icon',
    html: renderToStaticMarkup(<FaMapMarkerAlt className="text-red-600 text-4xl drop-shadow-md" />),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
})

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap()
    useEffect(() => {
        map.setView(center, map.getZoom())
    }, [center, map])
    return null
}

const EvidenceViewer = ({ record, t }: { record: Attendance, t: AppTranslation }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-0 shadow-2xl">
            <div className="relative min-h-[300px] flex items-center justify-center bg-muted/10">
                {imgError ? (
                    <div className="flex flex-col items-center justify-center p-10 text-muted-foreground/50">
                        <LuUnlink className="w-20 h-20 mb-3" />
                        <p className="font-medium">{t($ => $.attendance.history.linkBroken)}</p>
                    </div>
                ) : (
                    <img
                        src={record.photoEvidence || undefined}
                        alt="Evidence"
                        className="w-full h-auto object-contain max-h-[80vh] bg-black/5"
                        onError={() => setImgError(true)}
                    />
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                    <p className="text-sm font-medium">{t($ => $.attendance.history.createdAt)}: {string_date_formatted({ localeId: 'id', dateString: record.createdAt, format: 'dd-MM-yyyy HH:mm' })}</p>
                </div>
            </div>
        </DialogContent>
    );
};

export const AttendanceHistory = ({
    attendanceHistory,
    paginationData,
    onPaginationChange,
    employeeId,
    currentStatusOnDuty,
    onSuccess,
    employee
}: Props) => {
    const { t } = useAppTranslation();
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lng: number, address?: string } | null>(null);
    const [editCycle, setEditCycle] = useState<AttendanceCycle | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const cycles = groupAttendanceToCycles(attendanceHistory);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t($ => $.attendance.history.title)}</h3>
                <Button
                    variant="default"
                    size="sm"
                    className="h-9 gap-2 shadow-sm rounded-lg"
                    onClick={() => setIsCreateOpen(true)}
                >
                    <FaPlus className="w-3.5 h-3.5" />
                    {currentStatusOnDuty ? t($ => $.attendance.history.offDutyCheckOut) : t($ => $.attendance.history.onDutyCheckIn)}
                </Button>
            </div>

            <div className="grid gap-6">
                {cycles.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-xl bg-card/50">
                        <div className="bg-muted p-3 rounded-full mb-3">
                            <LuCalendar className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p>{t($ => $.shared.noData)}</p>
                    </div>
                ) : (
                    cycles.map((cycle) => {
                        const hasOff = !!cycle.offDuty;
                        const od = cycle.onDuty;
                        const fd = cycle.offDuty;

                        const odLocationDisplay = od.workLocationName
                            ? od.workLocationName
                            : (od.locationAttendanceName === '-'
                                ? t($ => $.attendance.history.locationNotFound)
                                : (od.locationAttendanceName || od.locationName || "-"));

                        const fdLocationDisplay = fd ? (
                            fd.workLocationName
                                ? fd.workLocationName
                                : (fd.locationAttendanceName === '-'
                                    ? t($ => $.attendance.history.locationNotFound)
                                    : (fd.locationAttendanceName || fd.locationName || "-"))
                        ) : "-";

                        return (
                            <div key={cycle.id} className={cn(
                                "flex flex-col w-full rounded-2xl border bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md border-border"
                            )}>
                                {/* Cycle Header */}
                                <div className="flex items-center justify-between px-6 py-4 bg-muted/20 rounded-t-2xl border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={cn(
                                            "px-3 py-1 text-xs font-semibold rounded-full",
                                            hasOff
                                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                                : "bg-green-50 text-green-700 border-green-200 animate-pulse"
                                        )}>
                                            {hasOff ? t($ => $.attendance.history.cycleFinished) : t($ => $.attendance.history.cycleActive)}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                                            {cycle.daysOnBoard ? `${cycle.daysOnBoard} ${t($ => $.attendance.days)}` : "—"}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                        onClick={() => setEditCycle(cycle)}
                                    >
                                        <FaEdit className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Cycle Content - Side by Side representation */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                                    {/* ON DUTY (Check-in) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-b border-border pb-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                            <h4 className="font-semibold text-sm text-green-700 dark:text-green-400">{t($ => $.attendance.history.onDutyCheckIn)}</h4>
                                        </div>
                                        {!(od as any).isSynthetic ? (
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <InfoRow
                                                        icon={LuCalendar}
                                                        label={t($ => $.attendance.history.checkInDate)}
                                                        value={string_date_formatted({ localeId: "id-ID", dateString: od.attendanceDate, format: "MMMM dd, yyyy" }) || "-"}
                                                    />
                                                    <InfoRow
                                                        icon={LuClock}
                                                        label={t($ => $.attendance.history.inputTime)}
                                                        value={string_date_formatted({ localeId: 'id', dateString: od.createdAt, format: 'dd-MM-yyyy HH:mm' }) || "-"}
                                                    />
                                                    <div className="col-span-full">
                                                        <InfoRow
                                                            icon={LuMapPin}
                                                            label={t($ => $.attendance.history.checkInLocation)}
                                                            value={odLocationDisplay}
                                                            valueClassName={od.locationAttendance ? "text-primary cursor-pointer hover:underline" : ""}
                                                            onClick={() => {
                                                                let pos = od.locationAttendance as any;
                                                                if (typeof pos === 'string') {
                                                                    try { pos = JSON.parse(pos); } catch (e) { }
                                                                }
                                                                if (pos?.latitude && pos?.longitude) {
                                                                    setSelectedLocation({
                                                                        lat: Number(pos.latitude),
                                                                        lng: Number(pos.longitude),
                                                                        address: odLocationDisplay
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {od.notes && (
                                                    <div className="rounded-xl bg-muted/40 border px-3 py-2 text-xs text-muted-foreground mt-2">
                                                        <LongText text={od.notes} className="text-xs" />
                                                    </div>
                                                )}
                                                {od.photoEvidence && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs mt-2">
                                                                <LuImage className="w-3.5 h-3.5" /> {t($ => $.attendance.history.evidence)}
                                                            </Button>
                                                        </DialogTrigger>
                                                        <EvidenceViewer record={od} t={t} />
                                                    </Dialog>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                                                <p className="text-xs font-medium">{t($ => $.attendance.history.noCheckIn)}</p>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="text-xs text-primary font-semibold mt-1"
                                                    onClick={() => setEditCycle(cycle)}
                                                >
                                                    {t($ => $.attendance.history.completeCycle)}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* OFF DUTY (Check-out) */}
                                    <div className="flex flex-col gap-4 md:border-l md:border-border md:pl-6">
                                        <div className="flex items-center gap-2 border-b border-border pb-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                            <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">{t($ => $.attendance.history.offDutyCheckOut)}</h4>
                                        </div>
                                        {fd ? (
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <InfoRow
                                                        icon={LuCalendar}
                                                        label={t($ => $.attendance.history.checkOutDate)}
                                                        value={string_date_formatted({ localeId: "id-ID", dateString: fd.attendanceDate, format: "MMMM dd, yyyy" }) || "-"}
                                                    />
                                                    <InfoRow
                                                        icon={LuClock}
                                                        label={t($ => $.attendance.history.inputTime)}
                                                        value={string_date_formatted({ localeId: 'id', dateString: fd.createdAt, format: 'dd-MM-yyyy HH:mm' }) || "-"}
                                                    />
                                                    <div className="col-span-full">
                                                        <InfoRow
                                                            icon={LuMapPin}
                                                            label={t($ => $.attendance.history.checkOutLocation)}
                                                            value={fdLocationDisplay}
                                                            valueClassName={fd.locationAttendance ? "text-primary cursor-pointer hover:underline" : ""}
                                                            onClick={() => {
                                                                let pos = fd.locationAttendance as any;
                                                                if (typeof pos === 'string') {
                                                                    try { pos = JSON.parse(pos); } catch (e) { }
                                                                }
                                                                if (pos?.latitude && pos?.longitude) {
                                                                    setSelectedLocation({
                                                                        lat: Number(pos.latitude),
                                                                        lng: Number(pos.longitude),
                                                                        address: fdLocationDisplay
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {fd.notes && (
                                                    <div className="rounded-xl bg-muted/40 border px-3 py-2 text-xs text-muted-foreground mt-2">
                                                        <LongText text={fd.notes} className="text-xs" />
                                                    </div>
                                                )}
                                                {fd.photoEvidence && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs mt-2">
                                                                <LuImage className="w-3.5 h-3.5" /> {t($ => $.attendance.history.evidence)}
                                                            </Button>
                                                        </DialogTrigger>
                                                        <EvidenceViewer record={fd} t={t} />
                                                    </Dialog>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                                                <p className="text-xs font-medium">{t($ => $.attendance.history.noCheckOut)}</p>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="text-xs text-primary font-semibold mt-1"
                                                    onClick={() => setEditCycle(cycle)}
                                                >
                                                    {t($ => $.attendance.history.completeCycle)}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {paginationData.totalPages > 1 && (
                <div className="border-t border-border pt-4">
                    <DataTablePagination
                        pageIndex={paginationData.page - 1}
                        setPageIndex={(page) => onPaginationChange({ ...paginationData, page: page + 1 })}
                        pageSize={paginationData.limit}
                        setPageSize={(limit) => onPaginationChange({ ...paginationData, limit, page: 1 })}
                        rowsCount={paginationData.total}
                        paginationData={paginationData}
                        onPaginationChange={onPaginationChange}
                    />
                </div>
            )}

            <EditAttendanceDialog
                cycle={editCycle}
                onClose={() => setEditCycle(null)}
                employeeId={employeeId}
                onSuccess={onSuccess}
                t={t}
                projectId={employee?.projectId}
                projectName={employee?.projectName}
            />

            <CreateAttendanceDialog
                isOpen={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                employeeId={employeeId}
                currentStatusOnDuty={currentStatusOnDuty}
                onSuccess={onSuccess}
                t={t}
                projectId={employee?.projectId}
                projectName={employee?.projectName}
            />

            {/* Map Dialog */}
            <Dialog open={!!selectedLocation} onOpenChange={(open) => !open && setSelectedLocation(null)}>
                <DialogContent aria-describedby={undefined} className="max-w-3xl w-[80vw] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-4 border-b border-slate-100 bg-white z-10">
                        <DialogTitle>{t($ => $.attendance.history.location)}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 relative bg-slate-100 w-full h-full">
                        {selectedLocation && (
                            <MapContainer
                                center={[selectedLocation.lat, selectedLocation.lng]}
                                zoom={16}
                                scrollWheelZoom={true}
                                className="w-full h-full z-0"
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={customMarkerIcon}>
                                    <Popup>
                                        <div className="text-xs font-medium">
                                            {selectedLocation.address || "Location"}
                                        </div>
                                    </Popup>
                                </Marker>
                                <MapUpdater center={[selectedLocation.lat, selectedLocation.lng]} />
                            </MapContainer>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
