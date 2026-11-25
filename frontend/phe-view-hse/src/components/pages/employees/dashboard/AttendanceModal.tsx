import { useRef } from "react";
import { Loader2, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppTranslation } from "@/lib/i18n-typed";

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    action: 'check-in' | 'check-out';
    userName: string;
    photoPreview: string | null;
    onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRetake: () => void;
    onSubmit: () => void;
    isPending: boolean;
    isError: boolean;
    hasSelectedPhoto: boolean;
}

export const AttendanceModal = ({
    isOpen,
    onClose,
    action,
    userName,
    photoPreview,
    onPhotoSelect,
    onRetake,
    onSubmit,
    isPending,
    isError,
    hasSelectedPhoto
}: AttendanceModalProps) => {
    const { t } = useAppTranslation();
    const inputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center border-b border-slate-100">
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                        {action === 'check-in' ? t($ => $.employeesAttendance.modalCheckInTitle) : t($ => $.employeesAttendance.modalCheckOutTitle)}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{userName}</p>
                </div>

                <div className="p-6">
                    {!photoPreview ? (
                        <div
                            className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-blue-500 transition-all group"
                            onClick={() => inputRef.current?.click()}
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                            </div>
                            <span className="text-sm text-slate-500 group-hover:text-blue-600">{t($ => $.employeesAttendance.modalPhotoPlaceholder)}</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative rounded-xl overflow-hidden aspect-[4/3] border border-slate-200">
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <button
                                type="button"
                                onClick={onRetake}
                                className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> {t($ => $.employeesAttendance.modalRetake)}
                            </button>
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={onPhotoSelect}
                    />

                    {isError && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{t($ => $.employeesAttendance.modalError)}</span>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                    >
                        {t($ => $.employeesAttendance.modalCancel)}
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isPending || !hasSelectedPhoto}
                        className="flex-1 py-3 bg-[#1e4a8f] text-white rounded-xl font-semibold hover:bg-[#2a5db8] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>{t($ => $.employeesAttendance.modalProcess)}</span>
                            </>
                        ) : (
                            t($ => $.employeesAttendance.modalConfirm)
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
