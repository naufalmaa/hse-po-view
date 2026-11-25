import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FaEdit, FaTrash, FaCheckCircle } from 'react-icons/fa';
import { MapPin, Plus, Navigation } from 'lucide-react';
import { useManageAttendance, Attendance } from "@/service/employee/attendance-list";
import { useWorkLocations, useCreateWorkLocation } from "@/service/work-location-api";
import { AppTranslation } from "@/lib/i18n-typed";
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";
import { AttendanceCycle } from "./AttendanceHistory";
import { DatePicker } from "@/components/custom/components";

type EditAttendanceDialogProps = {
    cycle: AttendanceCycle | null;
    onClose: () => void;
    employeeId: string;
    onSuccess: () => void;
    t: AppTranslation;
    projectId?: string | null;
    projectName?: string | null;
};

export const EditAttendanceDialog = ({
    cycle,
    onClose,
    employeeId,
    onSuccess,
    t,
    projectId,
    projectName
}: EditAttendanceDialogProps) => {
    const manageAttendanceMutation = useManageAttendance();
    const { data: workLocationsList, refetch: refetchWorkLocations } = useWorkLocations(projectId);
    const createWorkLocationMutation = useCreateWorkLocation();

    // Form states for Edit Cycle
    const [onDutyDate, setOnDutyDate] = useState("");
    const [onDutyTime, setOnDutyTime] = useState("");
    const [onDutyNotes, setOnDutyNotes] = useState("");
    const [onDutyLat, setOnDutyLat] = useState("");
    const [onDutyLng, setOnDutyLng] = useState("");
    const [onDutyWorkLocationId, setOnDutyWorkLocationId] = useState<string>("");
    const [isOnDutyAddingLocation, setIsOnDutyAddingLocation] = useState(false);
    const [quickLocationName, setQuickLocationName] = useState("");
    const [quickLocationLat, setQuickLocationLat] = useState("");
    const [quickLocationLng, setQuickLocationLng] = useState("");

    const [hasOffDuty, setHasOffDuty] = useState(false);
    const [offDutyDate, setOffDutyDate] = useState("");
    const [offDutyTime, setOffDutyTime] = useState("");
    const [offDutyNotes, setOffDutyNotes] = useState("");
    const [offDutyLat, setOffDutyLat] = useState("");
    const [offDutyLng, setOffDutyLng] = useState("");
    const [offDutyWorkLocationId, setOffDutyWorkLocationId] = useState<string>("");
    const [isOffDutyAddingLocation, setIsOffDutyAddingLocation] = useState(false);
    const [offQuickLocationName, setOffQuickLocationName] = useState("");
    const [offQuickLocationLat, setOffQuickLocationLat] = useState("");
    const [offQuickLocationLng, setOffQuickLocationLng] = useState("");

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Populate edit form values when cycle is selected
    useEffect(() => {
        if (cycle) {
            const od = cycle.onDuty;
            setOnDutyDate(od.attendanceDate || "");
            setOnDutyTime(od.createdAt ? new Date(od.createdAt).toISOString().slice(0, 16) : "");
            setOnDutyNotes(od.notes || "");
            setOnDutyWorkLocationId(od.workLocationId || "");
            setIsOnDutyAddingLocation(false);
            setQuickLocationName("");
            setQuickLocationLat("");
            setQuickLocationLng("");

            let odPos: any = od.locationAttendance;
            if (typeof odPos === 'string') {
                try { odPos = JSON.parse(odPos); } catch (e) { }
            }
            setOnDutyLat(odPos?.latitude ? String(odPos.latitude) : "");
            setOnDutyLng(odPos?.longitude ? String(odPos.longitude) : "");

            if (cycle.offDuty) {
                setHasOffDuty(true);
                const fd = cycle.offDuty;
                setOffDutyDate(fd.attendanceDate || "");
                setOffDutyTime(fd.createdAt ? new Date(fd.createdAt).toISOString().slice(0, 16) : "");
                setOffDutyNotes(fd.notes || "");
                setOffDutyWorkLocationId(fd.workLocationId || "");
                setIsOffDutyAddingLocation(false);
                setOffQuickLocationName("");
                setOffQuickLocationLat("");
                setOffQuickLocationLng("");
                let fdPos: any = fd.locationAttendance;
                if (typeof fdPos === 'string') {
                    try { fdPos = JSON.parse(fdPos); } catch (e) { }
                }
                setOffDutyLat(fdPos?.latitude ? String(fdPos.latitude) : "");
                setOffDutyLng(fdPos?.longitude ? String(fdPos.longitude) : "");
            } else {
                setHasOffDuty(false);
                setOffDutyDate("");
                setOffDutyTime("");
                setOffDutyNotes("");
                setOffDutyLat("");
                setOffDutyLng("");
                setOffDutyWorkLocationId(od.workLocationId || "");
                setIsOffDutyAddingLocation(false);
                setOffQuickLocationName("");
                setOffQuickLocationLat("");
                setOffQuickLocationLng("");
            }
        }
    }, [cycle]);

    const [gettingCoordinates, setGettingCoordinates] = useState(false);

    const handleGetCoords = (callback: (lat: string, lng: string) => void) => {
        if (!navigator.geolocation) {
            showNotifError({ message: "Geolocation tidak didukung oleh browser Anda" });
            return;
        }
        setGettingCoordinates(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                callback(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
                setGettingCoordinates(false);
                showNotifSuccess({ message: "Koordinat berhasil diambil dari lokasi saat ini" });
            },
            (err) => {
                setGettingCoordinates(false);
                showNotifError({ message: "Gagal mengambil lokasi: " + err.message });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleOnDutyLocationSelect = (locationId: string) => {
        setOnDutyWorkLocationId(locationId);
        const loc = workLocationsList?.find(l => l.id === locationId);
        if (loc) {
            setOnDutyLat(loc.latitude != null ? String(loc.latitude) : "");
            setOnDutyLng(loc.longitude != null ? String(loc.longitude) : "");
        }
    };

    const handleOffDutyLocationSelect = (locationId: string) => {
        setOffDutyWorkLocationId(locationId);
        const loc = workLocationsList?.find(l => l.id === locationId);
        if (loc) {
            setOffDutyLat(loc.latitude != null ? String(loc.latitude) : "");
            setOffDutyLng(loc.longitude != null ? String(loc.longitude) : "");
        }
    };

    const handleSaveQuickLocation = async (isOnDuty: boolean) => {
        const name = isOnDuty ? quickLocationName : offQuickLocationName;
        const lat = isOnDuty ? quickLocationLat : offQuickLocationLat;
        const lng = isOnDuty ? quickLocationLng : offQuickLocationLng;

        if (!name.trim()) {
            showNotifError({ message: "Nama lokasi wajib diisi" });
            return;
        }
        if (!projectId) {
            showNotifError({ message: "Employee tidak terafiliasi dengan proyek" });
            return;
        }

        try {
            const result = await createWorkLocationMutation.mutateAsync({
                projectId,
                name: name.trim(),
                latitude: lat ? parseFloat(lat) : null,
                longitude: lng ? parseFloat(lng) : null,
            });

            await refetchWorkLocations();
            if (result?.id) {
                if (isOnDuty) {
                    setOnDutyWorkLocationId(result.id);
                } else {
                    setOffDutyWorkLocationId(result.id);
                }
            }
            if (lat) {
                if (isOnDuty) setOnDutyLat(lat);
                else setOffDutyLat(lat);
            }
            if (lng) {
                if (isOnDuty) setOnDutyLng(lng);
                else setOffDutyLng(lng);
            }

            if (isOnDuty) {
                setIsOnDutyAddingLocation(false);
                setQuickLocationName("");
                setQuickLocationLat("");
                setQuickLocationLng("");
            } else {
                setIsOffDutyAddingLocation(false);
                setOffQuickLocationName("");
                setOffQuickLocationLat("");
                setOffQuickLocationLng("");
            }
            showNotifSuccess({ message: "Work Location berhasil ditambahkan" });
        } catch (error: any) {
            showNotifError({ message: error?.message || "Gagal menambahkan Work Location" });
        }
    };

    const handleSaveEdit = async () => {
        if (!cycle) return;

        try {
            // 1. Update On Duty record
            let onDutyPosition = null;
            if (onDutyLat && onDutyLng) {
                onDutyPosition = { latitude: parseFloat(onDutyLat), longitude: parseFloat(onDutyLng) };
            }

            const isOnDutySynthetic = cycle.onDuty.id === cycle.offDuty?.id;

            if (isOnDutySynthetic) {
                // Create a new on_duty record if date is supplied
                if (onDutyDate) {
                    await manageAttendanceMutation.mutateAsync({
                        action: 'create',
                        employeeId,
                        statusAfter: 'on_duty',
                        attendanceDate: onDutyDate,
                        notes: onDutyNotes === 'Missing Check-In Data' ? '' : onDutyNotes,
                        position: onDutyPosition,
                        workLocationId: onDutyWorkLocationId || null
                    });
                }
            } else {
                // Update existing check-in record
                await manageAttendanceMutation.mutateAsync({
                    action: 'update',
                    attendanceId: cycle.onDuty.id,
                    attendanceDate: onDutyDate,
                    notes: onDutyNotes,
                    position: onDutyPosition,
                    workLocationId: onDutyWorkLocationId || null
                });
            }

            // 2. Manage Off Duty record (create or update)
            if (hasOffDuty) {
                let offDutyPosition = null;
                if (offDutyLat && offDutyLng) {
                    offDutyPosition = { latitude: parseFloat(offDutyLat), longitude: parseFloat(offDutyLng) };
                }

                if (cycle.offDuty) {
                    // Update existing check-out
                    await manageAttendanceMutation.mutateAsync({
                        action: 'update',
                        attendanceId: cycle.offDuty.id,
                        attendanceDate: offDutyDate,
                        notes: offDutyNotes,
                        position: offDutyPosition,
                        workLocationId: offDutyWorkLocationId || null
                    });
                } else {
                    // Create new check-out to complete cycle
                    await manageAttendanceMutation.mutateAsync({
                        action: 'create',
                        employeeId,
                        statusAfter: 'off_duty',
                        attendanceDate: offDutyDate,
                        notes: offDutyNotes,
                        position: offDutyPosition,
                        workLocationId: offDutyWorkLocationId || null
                    });
                }
            } else if (cycle.offDuty) {
                // If it had offDuty but user unchecked it, delete the offDuty record
                await manageAttendanceMutation.mutateAsync({
                    action: 'delete',
                    attendanceId: cycle.offDuty.id
                });
            }

            showNotifSuccess({ message: "Attendance cycle updated successfully" });
            onClose();
            onSuccess();
        } catch (error: any) {
            showNotifError({ message: error.message || "Failed to update attendance" });
        }
    };

    const handleDeleteRecord = (attendanceId: string) => {
        setDeleteTargetId(attendanceId);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await manageAttendanceMutation.mutateAsync({
                action: 'delete',
                attendanceId: deleteTargetId
            });
            showNotifSuccess({ message: "Record deleted successfully" });
            setDeleteTargetId(null);
            onClose();
            onSuccess();
        } catch (error: any) {
            showNotifError({ message: error.message || "Failed to delete record" });
        }
    };

    return (
        <>
            <Dialog open={!!cycle} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <FaEdit className="text-primary" /> {t($ => $.attendance.dialog.editTitle)}
                        </DialogTitle>
                    </DialogHeader>

                    {cycle && (
                        <div className="space-y-6 my-4">
                            {/* ON DUTY FORM SECTION */}
                            <div className="space-y-4 border border-border p-4 rounded-xl bg-muted/10">
                                <div className="flex items-center justify-between border-b border-border pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                        <h4 className="font-semibold text-sm text-green-700">{t($ => $.attendance.dialog.checkInTitle)}</h4>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 rounded-lg text-xs"
                                        onClick={() => handleDeleteRecord(cycle.onDuty.id)}
                                    >
                                        <FaTrash className="w-3 h-3" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-full">
                                        <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.attendanceDate)}</label>
                                        <DatePicker
                                            value={onDutyDate ? new Date(onDutyDate + 'T00:00:00') : undefined}
                                            onChange={(date) => {
                                                if (date) {
                                                    const year = date.getFullYear();
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    setOnDutyDate(`${year}-${month}-${day}`);
                                                } else {
                                                    setOnDutyDate("");
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Work Location field (if employee has projectId) */}
                                    {projectId && (
                                        <div className="space-y-1.5 col-span-full border rounded-xl p-3 bg-muted/20">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                                    Work Location {projectName ? `(${projectName})` : ''}
                                                </label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-1.5"
                                                    onClick={() => setIsOnDutyAddingLocation(!isOnDutyAddingLocation)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    {isOnDutyAddingLocation ? "Tutup Form" : "Tambahkan Work Location"}
                                                </Button>
                                            </div>

                                            {isOnDutyAddingLocation ? (
                                                <div className="mt-2 space-y-2 p-2.5 bg-background rounded-lg border">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-medium text-muted-foreground">Tambah Lokasi Baru ke Proyek Ini</p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 text-[11px] flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                                            onClick={() => handleGetCoords((lat, lng) => {
                                                                setQuickLocationLat(lat);
                                                                setQuickLocationLng(lng);
                                                            })}
                                                            disabled={gettingCoordinates}
                                                        >
                                                            <Navigation className="h-3 w-3" />
                                                            {gettingCoordinates ? "Mencari GPS..." : "Gunakan Koordinat Lokasi Saat Ini"}
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <Input
                                                            placeholder="Nama Lokasi"
                                                            value={quickLocationName}
                                                            onChange={(e) => setQuickLocationName(e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                        <Input
                                                            placeholder="Latitude (opsional)"
                                                            type="number"
                                                            step="any"
                                                            value={quickLocationLat}
                                                            onChange={(e) => setQuickLocationLat(e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                        <Input
                                                            placeholder="Longitude (opsional)"
                                                            type="number"
                                                            step="any"
                                                            value={quickLocationLng}
                                                            onChange={(e) => setQuickLocationLng(e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-1">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => setIsOnDutyAddingLocation(false)}
                                                        >
                                                            Batal
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => handleSaveQuickLocation(true)}
                                                            disabled={createWorkLocationMutation.isPending}
                                                        >
                                                            {createWorkLocationMutation.isPending ? "Menyimpan..." : "Simpan Lokasi"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <select
                                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                    value={onDutyWorkLocationId}
                                                    onChange={(e) => handleOnDutyLocationSelect(e.target.value)}
                                                >
                                                    <option value="">-- Pilih Work Location --</option>
                                                    {(workLocationsList || []).map((loc) => (
                                                        <option key={loc.id} value={loc.id}>
                                                            {loc.name} {loc.latitude && loc.longitude ? `(${loc.latitude}, ${loc.longitude})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                    <div className="col-span-full flex items-center justify-between pt-1">
                                        <span className="text-xs font-semibold text-muted-foreground">Koordinat GPS Check-in</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-1.5"
                                            onClick={() => handleGetCoords((lat, lng) => {
                                                setOnDutyLat(lat);
                                                setOnDutyLng(lng);
                                            })}
                                            disabled={gettingCoordinates}
                                        >
                                            <Navigation className="h-3 w-3" />
                                            Gunakan Lokasi Saat Ini
                                        </Button>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.latitude)}</label>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g. -6.12345"
                                            value={onDutyLat}
                                            onChange={(e) => setOnDutyLat(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.longitude)}</label>
                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="e.g. 106.12345"
                                            value={onDutyLng}
                                            onChange={(e) => setOnDutyLng(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-full space-y-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.notesLabel)}</label>
                                        <Textarea
                                            value={onDutyNotes}
                                            onChange={(e) => setOnDutyNotes(e.target.value)}
                                            rows={2}
                                            placeholder={t($ => $.attendance.dialog.placeholderCheckInNotes)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* OFF DUTY FORM SECTION */}
                            <div className="space-y-4 border border-border p-4 rounded-xl bg-muted/10">
                                 <div className="flex items-center justify-between border-b border-border pb-2">
                                     {cycle.offDuty ? (
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                            <h4 className="font-semibold text-sm text-red-700">{t($ => $.attendance.dialog.checkOutTitle)}</h4>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help">
                                                        <FaCheckCircle className="text-green-500 w-4 h-4 ml-1" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {t($ => $.attendance.dialog.checkOutFilled)}
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2.5">
                                            <Checkbox
                                                id="hasOffDuty"
                                                checked={hasOffDuty}
                                                onCheckedChange={(checked) => {
                                                    setHasOffDuty(!!checked);
                                                    if (checked && !offDutyDate) {
                                                        const todayStr = new Date().toISOString().slice(0, 10);
                                                        setOffDutyDate(todayStr);
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor="hasOffDuty"
                                                className="font-bold text-sm text-red-700 dark:text-red-400 flex items-center gap-2 cursor-pointer select-none"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const newChecked = !hasOffDuty;
                                                    setHasOffDuty(newChecked);
                                                    if (newChecked && !offDutyDate) {
                                                        const todayStr = new Date().toISOString().slice(0, 10);
                                                        setOffDutyDate(todayStr);
                                                    }
                                                }}
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                                {t($ => $.attendance.dialog.checkOutTitle)}
                                            </label>
                                        </div>
                                    )}
                                    {hasOffDuty && cycle.offDuty && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 rounded-lg text-xs"
                                            onClick={() => handleDeleteRecord(cycle.offDuty!.id)}
                                        >
                                            <FaTrash className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                                {hasOffDuty && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                         <div className="space-y-1.5 col-span-full">
                                            <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.attendanceDate)}</label>
                                            <DatePicker
                                                value={offDutyDate ? new Date(offDutyDate + 'T00:00:00') : undefined}
                                                onChange={(date) => {
                                                    if (date) {
                                                        const year = date.getFullYear();
                                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                                        const day = String(date.getDate()).padStart(2, '0');
                                                        setOffDutyDate(`${year}-${month}-${day}`);
                                                    } else {
                                                        setOffDutyDate("");
                                                    }
                                                }}
                                            />
                                        </div>

                                        {/* Work Location field (if employee has projectId) */}
                                        {projectId && (
                                            <div className="space-y-1.5 col-span-full border rounded-xl p-3 bg-muted/20">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5 text-primary" />
                                                        Work Location {projectName ? `(${projectName})` : ''}
                                                    </label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-1.5"
                                                        onClick={() => setIsOffDutyAddingLocation(!isOffDutyAddingLocation)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        {isOffDutyAddingLocation ? "Tutup Form" : "Tambahkan Work Location"}
                                                    </Button>
                                                </div>

                                                {isOffDutyAddingLocation ? (
                                                    <div className="mt-2 space-y-2 p-2.5 bg-background rounded-lg border">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-medium text-muted-foreground">Tambah Lokasi Baru ke Proyek Ini</p>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-6 text-[11px] flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                                                onClick={() => handleGetCoords((lat, lng) => {
                                                                    setOffQuickLocationLat(lat);
                                                                    setOffQuickLocationLng(lng);
                                                                })}
                                                                disabled={gettingCoordinates}
                                                            >
                                                                <Navigation className="h-3 w-3" />
                                                                {gettingCoordinates ? "Mencari GPS..." : "Gunakan Koordinat Lokasi Saat Ini"}
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <Input
                                                                placeholder="Nama Lokasi"
                                                                value={offQuickLocationName}
                                                                onChange={(e) => setOffQuickLocationName(e.target.value)}
                                                                className="h-8 text-xs"
                                                            />
                                                            <Input
                                                                placeholder="Latitude (opsional)"
                                                                type="number"
                                                                step="any"
                                                                value={offQuickLocationLat}
                                                                onChange={(e) => setOffQuickLocationLat(e.target.value)}
                                                                className="h-8 text-xs"
                                                            />
                                                            <Input
                                                                placeholder="Longitude (opsional)"
                                                                type="number"
                                                                step="any"
                                                                value={offQuickLocationLng}
                                                                onChange={(e) => setOffQuickLocationLng(e.target.value)}
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-2 pt-1">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={() => setIsOffDutyAddingLocation(false)}
                                                            >
                                                                Batal
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={() => handleSaveQuickLocation(false)}
                                                                disabled={createWorkLocationMutation.isPending}
                                                            >
                                                                {createWorkLocationMutation.isPending ? "Menyimpan..." : "Simpan Lokasi"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <select
                                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                        value={offDutyWorkLocationId}
                                                        onChange={(e) => handleOffDutyLocationSelect(e.target.value)}
                                                    >
                                                        <option value="">-- Pilih Work Location --</option>
                                                        {(workLocationsList || []).map((loc) => (
                                                            <option key={loc.id} value={loc.id}>
                                                                {loc.name} {loc.latitude && loc.longitude ? `(${loc.latitude}, ${loc.longitude})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}
                                        <div className="col-span-full flex items-center justify-between pt-1">
                                            <span className="text-xs font-semibold text-muted-foreground">Koordinat GPS Check-out</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-1.5"
                                                onClick={() => handleGetCoords((lat, lng) => {
                                                    setOffDutyLat(lat);
                                                    setOffDutyLng(lng);
                                                })}
                                                disabled={gettingCoordinates}
                                            >
                                                <Navigation className="h-3 w-3" />
                                                Gunakan Lokasi Saat Ini
                                            </Button>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.latitude)}</label>
                                            <Input
                                                type="number"
                                                step="any"
                                                placeholder="e.g. -6.12345"
                                                value={offDutyLat}
                                                onChange={(e) => setOffDutyLat(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.longitude)}</label>
                                            <Input
                                                type="number"
                                                step="any"
                                                placeholder="e.g. 106.12345"
                                                value={offDutyLng}
                                                onChange={(e) => setOffDutyLng(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-full space-y-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.notesLabel)}</label>
                                            <Textarea
                                                value={offDutyNotes}
                                                onChange={(e) => setOffDutyNotes(e.target.value)}
                                                rows={2}
                                                placeholder={t($ => $.attendance.dialog.placeholderCheckOutNotes)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4">
                        <Button variant="outline" onClick={onClose}>
                            {t($ => $.attendance.dialog.cancel)}
                        </Button>
                        <Button variant="default" onClick={handleSaveEdit} disabled={manageAttendanceMutation.isPending}>
                            {manageAttendanceMutation.isPending ? t($ => $.attendance.dialog.saving) : t($ => $.attendance.dialog.saveChanges)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {deleteTargetId && (
                <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
                    <DialogContent className="max-w-md rounded-2xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
                                <FaTrash className="w-5 h-5" /> {t($ => $.attendance.dialog.deleteConfirmTitle)}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground font-medium">
                                {t($ => $.attendance.dialog.deleteConfirmDesc)}
                            </p>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
                                {t($ => $.attendance.dialog.cancel)}
                            </Button>
                            <Button variant="destructive" onClick={confirmDelete} disabled={manageAttendanceMutation.isPending}>
                                {manageAttendanceMutation.isPending ? t($ => $.attendance.dialog.deleting) : t($ => $.attendance.dialog.deleteData)}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};
