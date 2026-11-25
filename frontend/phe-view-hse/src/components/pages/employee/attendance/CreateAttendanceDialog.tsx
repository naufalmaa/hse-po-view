import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FaPlus } from 'react-icons/fa';
import { MapPin, Plus, Navigation } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useManageAttendance } from "@/service/employee/attendance-list";
import { useWorkLocations, useCreateWorkLocation } from "@/service/work-location-api";
import { AppTranslation } from "@/lib/i18n-typed";
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";
import { DatePicker } from "@/components/custom/components";

type CreateAttendanceDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    employeeId: string;
    currentStatusOnDuty: boolean;
    onSuccess: () => void;
    t: AppTranslation;
    projectId?: string | null;
    projectName?: string | null;
};

export const CreateAttendanceDialog = ({
    isOpen,
    onOpenChange,
    employeeId,
    currentStatusOnDuty,
    onSuccess,
    t,
    projectId,
    projectName
}: CreateAttendanceDialogProps) => {
    const manageAttendanceMutation = useManageAttendance();
    const { data: workLocationsList, refetch: refetchWorkLocations } = useWorkLocations(projectId);
    const createWorkLocationMutation = useCreateWorkLocation();

    const [newStatus, setNewStatus] = useState<'on_duty' | 'off_duty'>('on_duty');
    const [newDate, setNewDate] = useState("");
    const [newTime, setNewTime] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [newLat, setNewLat] = useState("");
    const [newLng, setNewLng] = useState("");
    const [selectedWorkLocationId, setSelectedWorkLocationId] = useState("");

    // Quick add work location state
    const [isAddingLocation, setIsAddingLocation] = useState(false);
    const [quickLocationName, setQuickLocationName] = useState("");
    const [quickLocationLat, setQuickLocationLat] = useState("");
    const [quickLocationLng, setQuickLocationLng] = useState("");

    // Set new record status based on current status to prevent duplicates
    useEffect(() => {
        if (isOpen) {
            setNewStatus(currentStatusOnDuty ? 'off_duty' : 'on_duty');
            const now = new Date();
            setNewDate(now.toISOString().slice(0, 10));
            setNewTime(now.toISOString().slice(0, 16));
            setNewNotes("");
            setNewLat("");
            setNewLng("");
            setSelectedWorkLocationId("");
            setIsAddingLocation(false);
            setQuickLocationName("");
            setQuickLocationLat("");
            setQuickLocationLng("");
        }
    }, [isOpen, currentStatusOnDuty]);

    const [gettingCoordinates, setGettingCoordinates] = useState(false);

    const handleGetQuickLocationCoords = () => {
        if (!navigator.geolocation) {
            showNotifError({ message: "Geolocation tidak didukung oleh browser Anda" });
            return;
        }
        setGettingCoordinates(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setQuickLocationLat(pos.coords.latitude.toFixed(6));
                setQuickLocationLng(pos.coords.longitude.toFixed(6));
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

    const handleGetDirectCoords = () => {
        if (!navigator.geolocation) {
            showNotifError({ message: "Geolocation tidak didukung oleh browser Anda" });
            return;
        }
        setGettingCoordinates(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewLat(pos.coords.latitude.toFixed(6));
                setNewLng(pos.coords.longitude.toFixed(6));
                setGettingCoordinates(false);
                showNotifSuccess({ message: "Koordinat absensi berhasil diambil dari lokasi saat ini" });
            },
            (err) => {
                setGettingCoordinates(false);
                showNotifError({ message: "Gagal mengambil lokasi: " + err.message });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleLocationSelect = (locationId: string) => {
        setSelectedWorkLocationId(locationId);
        const loc = workLocationsList?.find(l => l.id === locationId);
        if (loc) {
            setNewLat(loc.latitude != null ? String(loc.latitude) : "");
            setNewLng(loc.longitude != null ? String(loc.longitude) : "");
        }
    };

    const handleSaveQuickLocation = async () => {
        if (!quickLocationName.trim()) {
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
                name: quickLocationName.trim(),
                latitude: quickLocationLat ? parseFloat(quickLocationLat) : null,
                longitude: quickLocationLng ? parseFloat(quickLocationLng) : null,
            });

            await refetchWorkLocations();
            if (result?.id) {
                setSelectedWorkLocationId(result.id);
            }
            if (quickLocationLat) setNewLat(quickLocationLat);
            if (quickLocationLng) setNewLng(quickLocationLng);

            setIsAddingLocation(false);
            setQuickLocationName("");
            setQuickLocationLat("");
            setQuickLocationLng("");
            showNotifSuccess({ message: "Work Location berhasil ditambahkan" });
        } catch (error: any) {
            showNotifError({ message: error?.message || "Gagal menambahkan Work Location" });
        }
    };

    const handleCreateAttendance = async () => {
        try {
            let position = null;
            if (newLat && newLng) {
                position = { latitude: parseFloat(newLat), longitude: parseFloat(newLng) };
            }

            await manageAttendanceMutation.mutateAsync({
                action: 'create',
                employeeId,
                statusAfter: newStatus,
                attendanceDate: newDate,
                notes: newNotes,
                position,
                workLocationId: selectedWorkLocationId || null,
            });

            showNotifSuccess({ message: `Successfully checked ${newStatus === 'on_duty' ? 'In' : 'Out'}` });
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            showNotifError({ message: error.message || "Failed to create attendance" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <FaPlus className="text-primary" />
                        {newStatus === 'on_duty' ? t($ => $.attendance.dialog.createCheckInTitle) : t($ => $.attendance.dialog.createCheckOutTitle)}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl border">
                        <span className={cn("w-3 h-3 rounded-full", newStatus === 'on_duty' ? "bg-green-500 animate-ping" : "bg-red-500")} />
                        <span className="text-sm font-semibold">
                            {newStatus === 'on_duty' ? t($ => $.attendance.dialog.statusMessageOnDuty) : t($ => $.attendance.dialog.statusMessageOffDuty)}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-full">
                            <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.attendanceDate)}</label>
                            <DatePicker
                                value={newDate ? new Date(newDate + 'T00:00:00') : undefined}
                                onChange={(date) => {
                                    if (date) {
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        setNewDate(`${year}-${month}-${day}`);
                                    } else {
                                        setNewDate("");
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
                                        onClick={() => setIsAddingLocation(!isAddingLocation)}
                                    >
                                        <Plus className="h-3 w-3" />
                                        {isAddingLocation ? "Tutup Form" : "Tambahkan Work Location"}
                                    </Button>
                                </div>

                                {isAddingLocation ? (
                                    <div className="mt-2 space-y-2 p-2.5 bg-background rounded-lg border">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-muted-foreground">Tambah Lokasi Baru ke Proyek Ini</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-[11px] flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                                onClick={handleGetQuickLocationCoords}
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
                                                onClick={() => setIsAddingLocation(false)}
                                            >
                                                Batal
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={handleSaveQuickLocation}
                                                disabled={createWorkLocationMutation.isPending}
                                            >
                                                {createWorkLocationMutation.isPending ? "Menyimpan..." : "Simpan Lokasi"}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <select
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={selectedWorkLocationId}
                                        onChange={(e) => handleLocationSelect(e.target.value)}
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
                            <span className="text-xs font-semibold text-muted-foreground">Koordinat GPS Absensi</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-1.5"
                                onClick={handleGetDirectCoords}
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
                                value={newLat}
                                onChange={(e) => setNewLat(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.longitude)}</label>
                            <Input
                                type="number"
                                step="any"
                                placeholder="e.g. 106.12345"
                                value={newLng}
                                onChange={(e) => setNewLng(e.target.value)}
                            />
                        </div>
                        <div className="col-span-full space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">{t($ => $.attendance.dialog.notesLabel)}</label>
                            <Textarea
                                value={newNotes}
                                onChange={(e) => setNewNotes(e.target.value)}
                                rows={3}
                                placeholder={newStatus === 'on_duty' ? t($ => $.attendance.dialog.placeholderCheckInNotes) : t($ => $.attendance.dialog.placeholderCheckOutNotes)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t($ => $.attendance.dialog.cancel)}
                    </Button>
                    <Button variant="default" onClick={handleCreateAttendance} disabled={manageAttendanceMutation.isPending}>
                        {manageAttendanceMutation.isPending ? t($ => $.attendance.dialog.saving) : t($ => $.attendance.dialog.sendAttendance)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
