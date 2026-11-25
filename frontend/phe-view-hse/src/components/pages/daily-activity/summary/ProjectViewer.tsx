import React, { useState, useEffect } from 'react';
import { 
    Clock, Shield, TrendingDown, ClipboardList, Users, CloudSun, FileText, 
    Wind, Cloud, Droplets, CheckCircle, Image as ImageIcon, ImageOff,
    MessageSquare, Flame, GraduationCap, ClipboardCheck, Search, ShieldAlert,
    AlertTriangle, Sparkles, CheckSquare, Layers, Eye, EyeOff, RefreshCw
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PobPersonnelModal } from "./PobPersonnelModal";
import { useReportSyncPob } from "@/service/report";
import { showNotifSuccess, showNotifError } from "@/lib/show-notif";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Props = {
    template: Record<string, any>;
    value: Record<string, any>;
    className?: string;
    onReportUpdated?: (updatedDetail: Record<string, any>) => void;
};

const ProjectViewer = ({ template, value, className, onReportUpdated }: Props) => {
    const report = value || {};
    const [overrideDetail, setOverrideDetail] = useState<any>(null);
    const queryClient = useQueryClient();
    const syncPobMutation = useReportSyncPob();

    useEffect(() => {
        setOverrideDetail(null);
    }, [value?.id]);

    const activeDetail = overrideDetail || report?.detail || {};

    const [selectedImage, setSelectedImage] = useState<any>(null);
    const [showInspectionTables, setShowInspectionTables] = useState<boolean>(false);
    const [pobModalOpen, setPobModalOpen] = useState<boolean>(false);
    const [selectedPobType, setSelectedPobType] = useState<'phe' | 'contr'>('phe');

    // Handle manual sync POB trigger
    const handleSyncPob = () => {
        if (!report?.id || syncPobMutation.isPending) return;
        syncPobMutation.mutate(
            { reportId: report.id },
            {
                onSuccess: (response: any) => {
                    const freshDetail = response?.data;
                    if (freshDetail) {
                        setOverrideDetail(freshDetail);
                        onReportUpdated?.(freshDetail);
                    }
                    queryClient.invalidateQueries({ queryKey: ['report-duty-list'] });
                    showNotifSuccess({
                        message: 'POB dan Manhours berhasil disinkronkan',
                    });
                },
                onError: (error: any) => {
                    showNotifError({
                        message: error?.response?.data?.message || 'Gagal menyinkronkan POB',
                    });
                },
            }
        );
    };

    // Format date - DD/MM/YYYY format
    const reportDate = new Date(report.reportDate || new Date());

    // Get project name
    const projectName = report.subtypeName || 'N/A';
    const workLocationName = report.workLocationName || activeDetail?.identity?.workLocationName || null;
    const projectInstance = report.instansi || 'PHE OSES';

    // Get reporter name
    const reporterName = report.reportedBy || 'N/A';

    // Get lagging indicators
    const lagging = activeDetail?.lagging || {};

    // Get manhours data
    const manhours = activeDetail?.manhours || {};
    const pobPhe = Number(manhours.pobPheOses) || 0;
    const pobContr = Number(manhours.pobContractor) || 0;
    const hoursPhe = Number(manhours.hoursPobPheOses) || 0;
    const hoursContr = Number(manhours.hoursPobContractor) || 0;
    const manhoursPhe = pobPhe * hoursPhe;
    const manhoursContr = pobContr * hoursContr;
    const manhoursTotal = manhoursPhe + manhoursContr;

    // Get smart card data
    const smartCard = activeDetail?.smartCard || {};

    // Get sections data
    const meetings = Array.isArray(activeDetail?.meeting) ? activeDetail.meeting : [];
    const drills = Array.isArray(activeDetail?.drill) ? activeDetail.drill : [];
    const trainings = Array.isArray(activeDetail?.training) ? activeDetail.training : [];
    const inspections = Array.isArray(activeDetail?.inspections) ? activeDetail.inspections : [];
    const preUseInspections = inspections.filter((i: any) => i.type === 'pre_use');
    const fieldInspections = inspections.filter((i: any) => i.type === 'field');

    // Pre-Use Inspection - Close Finding
    const closedPreUseInspections = preUseInspections.filter((item: any) => 
        (Number(item.openFinding) <= 0 || !item.openFinding) && Number(item.closeFinding) > 0
    );

    // Inspection (Field) - only Close Finding
    const closedFieldInspections = fieldInspections.filter((item: any) => 
        (Number(item.openFinding) <= 0 || !item.openFinding) && Number(item.closeFinding) > 0
    );

    const permits = Array.isArray(activeDetail?.permit) ? activeDetail?.permit : [];
    const highlights = activeDetail?.highlight || {};

    // Parse overstay personnel (only DOB >= 21 days)
    const rawOverstay = highlights.overstayPersonnel;
    const overstayPersonnel: Array<{ name: string; company: string; dob?: string | number }> = Array.isArray(rawOverstay)
        ? rawOverstay.filter((p: any) => {
            const days = parseInt(String(p.dob || p.daysOnBoard || ''), 10);
            return isNaN(days) ? true : days >= 21;
          })
        : (typeof rawOverstay === 'string' && rawOverstay.trim() !== ''
            ? [{ name: rawOverstay, company: '-', dob: '≥21' }]
            : []);

    // Filter HSSE issues: ALL Open Findings from BOTH Pre-Use AND Field inspections
    const preUseOpen = preUseInspections
        .filter((item: any) => Number(item.openFinding) > 0 || Number(item.outstandingFinding) > 0)
        .map((item: any) => ({ ...item, category: 'Pre-Use' }));
    const fieldOpen = fieldInspections
        .filter((item: any) => Number(item.openFinding) > 0 || Number(item.outstandingFinding) > 0)
        .map((item: any) => ({ ...item, category: 'Field' }));
    const hsseIssues = [...preUseOpen, ...fieldOpen];

    // Get weather data
    const weatherData = highlights.weather;

    // Get supporting images
    const rawFiles = activeDetail?.supportingFiles || report.supportingFiles || report?.detail?.supportingFiles || [];
    const images = rawFiles.filter((f: any) => {
        const isImage = f.fileType && typeof f.fileType === 'string' && f.fileType.startsWith('image/');
        const hasImageExt = f.fileName && typeof f.fileName === 'string' && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.fileName);
        return isImage || hasImageExt;
    });

    const parseWeatherData = (data: string) => {
        if (!data) return { wind: 'N/A', sky: 'N/A', sea: 'N/A' };
        const windMatch = data.match(/Wind Speed.*?:?\s*(\d+(?:\.\d+)?)/i);
        const skyMatch = data.match(/Sky Condition.*?:?\s*([^,]+)/i);
        const seaMatch = data.match(/(?:Sea Level|Wave).*?:?\s*(\d+(?:\.\d+)?)/i);
        return {
            wind: windMatch ? windMatch[1] + ' Knots' : 'N/A',
            sky: skyMatch ? skyMatch[1].trim() : 'N/A',
            sea: seaMatch ? seaMatch[1] + ' m' : 'N/A'
        };
    };
    const weatherMetrics = parseWeatherData(weatherData);

    // Kartu Pintar observations count
    const kartuPintarCount = (Number(smartCard.unsafeAction) || 0) + 
                            (Number(smartCard.unsafeCondition) || 0) + 
                            (Number(smartCard.nearMiss) || 0) + 
                            (Number(smartCard.processSafety) || 0);

    // Leading Indicators Metrics (6 consolidated cards)
    const leadingMetrics = [
        { label: 'Meeting', count: meetings.length, icon: MessageSquare, color: 'text-blue-600', border: 'border-blue-500' },
        { label: 'Drill', count: drills.length, icon: Flame, color: 'text-amber-600', border: 'border-amber-500' },
        { label: 'Training', count: trainings.length, icon: GraduationCap, color: 'text-emerald-600', border: 'border-emerald-500' },
        { label: 'PRE-USE INSPECTION / INSPECTION', count: `${preUseInspections.length} / ${fieldInspections.length}`, icon: ClipboardCheck, color: 'text-indigo-600', border: 'border-indigo-500' },
        { label: 'Kartu Pintar', count: kartuPintarCount, icon: Sparkles, color: 'text-purple-600', border: 'border-purple-500' },
        { label: 'PTW', count: permits.length, icon: ClipboardList, color: 'text-sky-600', border: 'border-sky-500' },
    ];

    // Lagging pyramid data: NM comes from lagging.nearMiss; UA/UC tier directly below NM
    const laggingPyramidData = [
        { label: 'Fatality', shortLabel: 'F', val: `${lagging.fatality || 0}`, color: 'bg-[#0b1e3b]' },
        { label: 'LTI', shortLabel: 'LTI', val: `${lagging.lti || 0}`, color: 'bg-[#102a52]' },
        { label: 'RDWC', shortLabel: 'RDWC', val: `${lagging.restrictedWorkDayCase || 0}`, color: 'bg-[#163c70]' },
        { label: 'MTC', shortLabel: 'MTC', val: `${lagging.medicalTreatmentCase || 0}`, color: 'bg-[#005a9e]' },
        { label: 'First Aid', shortLabel: 'FA', val: `${lagging.firstAid || 0}`, color: 'bg-[#0078d4]' },
        { label: 'Near Miss', shortLabel: 'NM', val: `${lagging.nearMiss || 0}`, color: 'bg-[#0091f2]' },
        { label: 'Unsafe Action / Condition', shortLabel: 'UA/UC', val: `${smartCard.unsafeAction || 0}/${smartCard.unsafeCondition || 0}`, color: 'bg-[#1d70b8]' },
        { label: 'Prop. Damage', shortLabel: 'PD', val: `${lagging.propertyDamage || 0}`, color: 'bg-[#00b7c3]' },
        { label: 'Env. Damage', shortLabel: 'ED', val: `${lagging.environmentalDamage || 0}`, color: 'bg-[#03dac5]' }
    ];

    return (
        <>
            <div className={`p-6 grid grid-cols-12 gap-6 bg-slate-50 ${className || ''}`}>
                <div className="col-span-12 flex flex-col gap-6">

                    {/* TOP ROW: Manhours & POB, Leading Indicators, Lagging Indicators */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">

                        {/* 1. Manhours & POB Card */}
                        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                                <div className="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <Clock className="w-4 h-4" />
                                    Manhours & POB
                                </div>
                                <div className="flex items-center gap-2">
                                    {workLocationName && (
                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            {workLocationName}
                                        </span>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={syncPobMutation.isPending}
                                        onClick={handleSyncPob}
                                        className="h-7 w-7 text-slate-500 hover:text-[#0078D4] hover:bg-blue-50/80 rounded-md transition-all cursor-pointer"
                                        title="Sinkronkan POB & Manhours dengan absensi terbaru"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", syncPobMutation.isPending && "animate-spin text-[#0078D4]")} />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col justify-between gap-3.5 flex-grow">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedPobType('phe');
                                            setPobModalOpen(true);
                                        }}
                                        className="bg-white p-3 rounded border-l-4 border-blue-600 shadow-sm text-left transition-all hover:bg-blue-50/60 hover:shadow-md cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        title="Klik untuk melihat detail pekerja PHE OSES"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5 group-hover:text-blue-700 transition-colors">
                                                POB PHE
                                            </p>
                                            <Users className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                        </div>
                                        <div className="flex items-baseline justify-between mt-0.5">
                                            <p className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                                {pobPhe}
                                            </p>
                                            <span className="text-[9px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                Lihat List →
                                            </span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedPobType('contr');
                                            setPobModalOpen(true);
                                        }}
                                        className="bg-white p-3 rounded border-l-4 border-cyan-500 shadow-sm text-left transition-all hover:bg-cyan-50/60 hover:shadow-md cursor-pointer group focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                        title="Klik untuk melihat detail pekerja Contractor"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5 group-hover:text-cyan-700 transition-colors">
                                                POB Contr.
                                            </p>
                                            <Users className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-600 transition-colors" />
                                        </div>
                                        <div className="flex items-baseline justify-between mt-0.5">
                                            <p className="text-xl font-bold text-slate-800 group-hover:text-cyan-700 transition-colors">
                                                {pobContr}
                                            </p>
                                            <span className="text-[9px] text-cyan-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                Lihat List →
                                            </span>
                                        </div>
                                    </button>
                                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Manhours PHE</p>
                                        <p className="text-base font-bold text-slate-700">{manhoursPhe.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Manhours Contr.</p>
                                        <p className="text-base font-bold text-slate-700">{manhoursContr.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="bg-blue-50/70 p-3 rounded border border-blue-100 flex items-center justify-between px-3.5">
                                    <p className="text-[10px] text-blue-800 font-bold uppercase">Manhours Total</p>
                                    <p className="text-base font-extrabold text-blue-900">{manhoursTotal.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Leading Indicators Card */}
                        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                                <div className="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <Shield className="w-4 h-4" />
                                    Leading Indicators
                                </div>
                                <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                    6 Activities
                                </span>
                            </div>
                            <div className="p-3.5 flex flex-col justify-between gap-3.5 flex-grow h-full">
                                <div className="flex-1 grid grid-cols-3 gap-3 auto-rows-fr">
                                    {leadingMetrics.map((metric, idx) => (
                                        <div key={idx} className={`bg-slate-50/80 p-3 rounded-lg border-l-4 ${metric.border} shadow-xs flex flex-col justify-between h-full`}>
                                            <div className="flex items-start justify-between gap-1 mb-1.5">
                                                <span className="text-xs font-bold text-slate-700 uppercase whitespace-normal break-words leading-tight" title={metric.label}>
                                                    {metric.label}
                                                </span>
                                                <metric.icon className={`w-4 h-4 shrink-0 ${metric.color}`} />
                                            </div>
                                            <span className="text-xl font-black text-slate-800 leading-none mt-auto pt-1">{metric.count}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        <span>Recorded activities & observations</span>
                                    </div>
                                    <span className="font-semibold text-slate-600">Total: {meetings.length + drills.length + trainings.length + inspections.length + kartuPintarCount + permits.length}</span>
                                </div>
                            </div>
                        </div>


                        {/* 3. Lagging Indicators (Pyramid + Description) */}
                        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                                <div className="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <TrendingDown className="w-4 h-4" />
                                    Lagging Indicators
                                </div>
                                <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                    LTA: {lagging.freeLtaDays || 0}d
                                </span>
                            </div>
                            <div className="p-3 flex items-center justify-center flex-grow bg-white relative">
                                <div className="w-full h-48 relative">
                                    <div className="w-full h-full" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
                                        <div className="flex flex-col h-full w-full">
                                            {laggingPyramidData.map((item, index) => (
                                                <div key={index} className={`${item.color} flex-1 w-full flex items-center justify-center relative border-b border-white/10`}>
                                                    <span className="text-[8px] font-bold z-10 text-white tracking-wider">
                                                        {item.shortLabel}: {item.val}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Lagging Indicator Description */}
                            <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block mb-1">
                                    Description
                                </span>
                                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line break-words max-h-24 overflow-y-auto">
                                    {lagging.description?.trim() ? lagging.description : '-'}
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* ACTIVITIES SECTION: Full Width with 7 Sequential Detail Tables */}
                    <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                            <div className="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
                                <Users className="w-4 h-4" />
                                Activities Detail
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInspectionTables(!showInspectionTables)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                        showInspectionTables 
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-xs' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-xs'
                                    }`}
                                    title={showInspectionTables ? "Sembunyikan Tabel Inspeksi" : "Tampilkan Tabel Inspeksi"}
                                >
                                    {showInspectionTables ? <EyeOff className="w-3.5 h-3.5 text-indigo-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                                    <span>{showInspectionTables ? 'Sembunyikan Tabel Inspeksi' : 'Tampilkan Tabel Inspeksi'}</span>
                                </button>
                                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                                    {showInspectionTables ? '7' : '5'} Program Sections
                                </span>
                            </div>
                        </div>

                        <div className="p-4 flex flex-col gap-6">                            {/* 1. Meeting Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                        1. Meeting Activity
                                    </div>
                                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                        Total: {meetings.length}
                                    </span>
                                </div>
                                <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                    <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '5%' }} />
                                            <col style={{ width: '20%' }} />
                                            <col style={{ width: '65%' }} />
                                            <col style={{ width: '10%' }} />
                                        </colgroup>
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th style={{ width: '5%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                <th style={{ width: '20%' }} className="px-3 py-2">Jenis Meeting</th>
                                                <th style={{ width: '65%' }} className="px-3 py-2">Meeting Agenda</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2 text-center">Total Peserta</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {meetings.length > 0 ? (
                                                meetings.map((m: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">{idx + 1}</td>
                                                        <td className="px-3 py-2.5 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.jenisMeeting || 'Toolbox Meeting'}</td>
                                                        <td className="px-3 py-2.5 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{m.description || '-'}</td>
                                                        <td className="px-3 py-2.5 text-center align-top font-bold text-blue-700">{m.absencePercentage || 0}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Meeting</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 2. Drill Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                                        2. Drill Activity
                                    </div>
                                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                                        Total: {drills.length}
                                    </span>
                                </div>
                                <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                    <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '5%' }} />
                                            <col style={{ width: '20%' }} />
                                            <col style={{ width: '65%' }} />
                                            <col style={{ width: '10%' }} />
                                        </colgroup>
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th style={{ width: '5%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                <th style={{ width: '20%' }} className="px-3 py-2">Jenis Drill</th>
                                                <th style={{ width: '65%' }} className="px-3 py-2">Skenario / Deskripsi Drill</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2 text-center">Total Peserta</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {drills.length > 0 ? (
                                                drills.map((d: any, idx: number) => {
                                                    const drillTypes = [];
                                                    if (d.fireDrill) drillTypes.push('Fire Drill');
                                                    if (d.abandonDrill) drillTypes.push('Abandon Drill');
                                                    if (d.musteringDrill) drillTypes.push('Mustering Drill');
                                                    if (d.medievacDrill) drillTypes.push('Medievac Drill');
                                                    if (d.h2sDrill) drillTypes.push('H2S Drill');
                                                    if (d.oilPollutionPreventionDrill) drillTypes.push('Oil Pollution Prev.');
                                                    if (d.firstAidDrill) drillTypes.push('First Aid Drill');
                                                    if (d.othersDrill) drillTypes.push('Others');
                                                    const typeLabel = drillTypes.length > 0 ? drillTypes.join(', ') : 'Drill Exercise';

                                                    return (
                                                        <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                                                            <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">{idx + 1}</td>
                                                            <td className="px-3 py-2.5 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{typeLabel}</td>
                                                            <td className="px-3 py-2.5 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{d.description || '-'}</td>
                                                            <td className="px-3 py-2.5 text-center align-top font-bold text-amber-700">{d.totalParticipants || 0}</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Drill</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. Training Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                        <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                                        3. Training Activity
                                    </div>
                                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                        Total: {trainings.length}
                                    </span>
                                </div>
                                <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                    <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '5%' }} />
                                            <col style={{ width: '20%' }} />
                                            <col style={{ width: '65%' }} />
                                            <col style={{ width: '10%' }} />
                                        </colgroup>
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th style={{ width: '5%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                <th style={{ width: '20%' }} className="px-3 py-2">Jenis Training</th>
                                                <th style={{ width: '65%' }} className="px-3 py-2">Topik / Deskripsi Training</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2 text-center">Total Peserta</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {trainings.length > 0 ? (
                                                trainings.map((t: any, idx: number) => {
                                                    const trainingTypes = [];
                                                    if (t.clsr) trainingTypes.push('CLSR');
                                                    if (t.akhlak) trainingTypes.push('AKHLAK');
                                                    if (t.unsafeActionCategory) trainingTypes.push('Unsafe Action Cat.');
                                                    if (t.sika) trainingTypes.push('SIKA');
                                                    if (t.l2ra) trainingTypes.push('L2RA');
                                                    if (t.siteInduction) trainingTypes.push('Site Induction');
                                                    if (t.preSiteInduction) trainingTypes.push('Pre-Site Induction');
                                                    if (t.shipboardTraining) trainingTypes.push('Shipboard Training');
                                                    if (t.othersTraining) trainingTypes.push('Others');
                                                    const typeLabel = trainingTypes.length > 0 ? trainingTypes.join(', ') : 'Safety Training';

                                                    return (
                                                        <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                                            <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">{idx + 1}</td>
                                                            <td className="px-3 py-2.5 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{typeLabel}</td>
                                                            <td className="px-3 py-2.5 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{t.description || '-'}</td>
                                                            <td className="px-3 py-2.5 text-center align-top font-bold text-emerald-700">{t.totalParticipants || 0}</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Training</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4 & 5. Inspection Tables (Pre-Use & Field) */}
                            {showInspectionTables ? (
                                <>
                                    {/* 4. Pre-Use Inspection Table */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                            <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                                <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />
                                                4. Pre-Use Inspection
                                            </div>
                                            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                                                Total: {closedPreUseInspections.length}
                                            </span>
                                        </div>
                                        <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                            <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                                <colgroup>
                                                    <col style={{ width: '5%' }} />
                                                    <col style={{ width: '20%' }} />
                                                    <col style={{ width: '28%' }} />
                                                    <col style={{ width: '23%' }} />
                                                    <col style={{ width: '13%' }} />
                                                    <col style={{ width: '11%' }} />
                                                </colgroup>
                                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                    <tr>
                                                        <th style={{ width: '5%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                        <th style={{ width: '20%' }} className="px-3 py-2">Item / Alat Diinspeksi</th>
                                                        <th style={{ width: '28%' }} className="px-3 py-2">Temuan (Finding)</th>
                                                        <th style={{ width: '23%' }} className="px-3 py-2">Tindak Lanjut (Follow-Up)</th>
                                                        <th style={{ width: '13%' }} className="px-3 py-2 text-center">Status</th>
                                                        <th style={{ width: '11%' }} className="px-3 py-2 text-center">Deadline</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {closedPreUseInspections.length > 0 ? (
                                                        closedPreUseInspections.map((p: any, idx: number) => {
                                                            const statusText = p.openFinding > 0 ? 'Open Finding' : (p.closeFinding > 0 ? 'Close Finding' : (p.noIssue > 0 ? 'No Issue' : 'Complete'));
                                                            const statusColor = p.openFinding > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';

                                                            return (
                                                                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                                                    <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">{idx + 1}</td>
                                                                    <td className="px-3 py-2.5 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{p.description || '-'}</td>
                                                                    <td className="px-3 py-2.5 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{p.finding || '-'}</td>
                                                                    <td className="px-3 py-2.5 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{p.followUp || '-'}</td>
                                                                    <td className="px-3 py-2.5 text-center align-top">
                                                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center justify-center max-w-full text-center leading-tight ${statusColor}`}>
                                                                            {statusText}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center text-slate-500 font-mono align-top whitespace-nowrap">{p.deadline || '-'}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Pre-Use Inspection (Close Finding)</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 5. Inspection (Field) Table - Close Finding Only */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                            <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                                <Search className="w-3.5 h-3.5 text-teal-600" />
                                                5. Inspection (Field)
                                            </div>
                                            <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                                                Total: {closedFieldInspections.length}
                                            </span>
                                        </div>
                                        <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                            <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                                <colgroup>
                                                    <col style={{ width: '5%' }} />
                                                    <col style={{ width: '20%' }} />
                                                    <col style={{ width: '28%' }} />
                                                    <col style={{ width: '23%' }} />
                                                    <col style={{ width: '13%' }} />
                                                    <col style={{ width: '11%' }} />
                                                </colgroup>
                                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                    <tr>
                                                        <th style={{ width: '5%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                        <th style={{ width: '20%' }} className="px-3 py-2">Area / Objek Inspeksi</th>
                                                        <th style={{ width: '28%' }} className="px-3 py-2">Temuan (Finding)</th>
                                                        <th style={{ width: '23%' }} className="px-3 py-2">Tindak Lanjut (Follow-Up)</th>
                                                        <th style={{ width: '13%' }} className="px-3 py-2 text-center">Status</th>
                                                        <th style={{ width: '11%' }} className="px-3 py-2 text-center">Deadline</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {closedFieldInspections.length > 0 ? (
                                                        closedFieldInspections.map((f: any, idx: number) => {
                                                            return (
                                                                <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                                                                    <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">{idx + 1}</td>
                                                                    <td className="px-3 py-2.5 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{f.description || '-'}</td>
                                                                    <td className="px-3 py-2.5 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{f.finding || '-'}</td>
                                                                    <td className="px-3 py-2.5 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{f.followUp || '-'}</td>
                                                                    <td className="px-3 py-2.5 text-center align-top">
                                                                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center justify-center max-w-full text-center leading-tight bg-green-50 text-green-700 border-green-200">
                                                                            Close Finding
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center text-slate-500 font-mono align-top whitespace-nowrap">{f.deadline || '-'}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada data kegiatan Inspection (Close Finding)</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-4 bg-slate-50/80 border border-dashed border-slate-300 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                            <ClipboardCheck className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                                                <span>Tabel 4. Pre-Use Inspection & 5. Inspection (Field) Disembunyikan</span>
                                                <span className="text-[10px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded font-normal">Default</span>
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Seluruh temuan berstatus <strong>Open Finding</strong> otomatis dirangkum lengkap pada <strong>Table HSSE Issues</strong> di bawah.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowInspectionTables(true)}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#0078D4] border border-slate-200 text-xs font-semibold rounded-md shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Tampilkan Tabel</span>
                                    </button>
                                </div>
                            )}

                            {/* 6. Kartu Pintar Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                        6. Kartu Pintar
                                    </div>
                                    <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                                        Total Observasi: {kartuPintarCount}
                                    </span>
                                </div>
                                <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                    <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '5%' }} />
                                            <col style={{ width: '55%' }} />
                                            <col style={{ width: '10%' }} />
                                            <col style={{ width: '10%' }} />
                                            <col style={{ width: '10%' }} />
                                            <col style={{ width: '10%' }} />
                                        </colgroup>
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th style={{ width: '5%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                <th style={{ width: '55%' }} className="px-3 py-2">Deskripsi / Pengamatan</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2 text-center">Unsafe Action</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2 text-center">Unsafe Condition</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2 text-center">Near Miss</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2 text-center">Process Safety</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="hover:bg-purple-50/30 transition-colors">
                                                <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">1</td>
                                                <td className="px-3 py-2.5 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                                                    {smartCard.description || 'Laporan observasi kartu pintar hari ini'}
                                                </td>
                                                <td className="px-3 py-2.5 text-center align-top font-bold text-blue-700">{smartCard.unsafeAction || 0}</td>
                                                <td className="px-3 py-2.5 text-center align-top font-bold text-sky-600">{smartCard.unsafeCondition || 0}</td>
                                                <td className="px-3 py-2.5 text-center align-top font-bold text-cyan-600">{smartCard.nearMiss || 0}</td>
                                                <td className="px-3 py-2.5 text-center align-top font-bold text-slate-600">{smartCard.processSafety || 0}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 7. Permit To Work Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                        <ClipboardList className="w-3.5 h-3.5 text-sky-600" />
                                        7. Permit To Work
                                    </div>
                                    <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                                        Active: {permits.length}
                                    </span>
                                </div>
                                <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                    <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '4%' }} />
                                            <col style={{ width: '8%' }} />
                                            <col style={{ width: '34%' }} />
                                            <col style={{ width: '12%' }} />
                                            <col style={{ width: '14%' }} />
                                            <col style={{ width: '8%' }} />
                                            <col style={{ width: '10%' }} />
                                            <col style={{ width: '10%' }} />
                                        </colgroup>
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th style={{ width: '4%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                <th style={{ width: '8%' }} className="px-3 py-2">Type</th>
                                                <th style={{ width: '34%' }} className="px-3 py-2">Description</th>
                                                <th style={{ width: '12%' }} className="px-3 py-2">PTW #</th>
                                                <th style={{ width: '14%' }} className="px-3 py-2">Location</th>
                                                <th style={{ width: '8%' }} className="px-3 py-2 text-center">RA</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2">Authority</th>
                                                <th style={{ width: '10%' }} className="px-3 py-2">Controller</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {permits.length > 0 ? (
                                                permits.map((ptw: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">{idx + 1}</td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase text-[9px] inline-flex items-center justify-center text-center min-w-[50px]">
                                                                {ptw.description?.match(/^[A-Z0-9-]+/)?.[0] || 'WORK'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                                                            {ptw.description || 'N/A'}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-slate-600 align-top font-mono text-[9px] whitespace-nowrap">{ptw.ptwNumber || ptw.noPTW || 'N/A'}</td>
                                                        <td className="px-3 py-2.5 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{ptw.location || 'N/A'}</td>
                                                        <td className="px-3 py-2.5 text-slate-600 align-top font-mono text-center">{ptw.raJsaa || ptw.RA_JSA || 'N/A'}</td>
                                                        <td className="px-3 py-2.5 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{ptw.performingAuthority || 'N/A'}</td>
                                                        <td className="px-3 py-2.5 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{ptw.siteController || 'N/A'}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={8} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada data Permit To Work</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* DAILY HIGHLIGHTS SECTION: Full Width with Daily Activities, Next Plan, Overstay Table, and HSSE Issues Table */}
                    <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                            <div className="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
                                <FileText className="w-4 h-4" />
                                Daily Highlights
                            </div>
                            <span className="text-xs text-slate-500 font-medium">Activities, Next Plan, Overstay Personnel & HSSE Issues</span>
                        </div>

                        <div className="p-4 flex flex-col gap-5">
                            {/* Activities & Next Plan Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
                                    <p className="text-blue-700 font-bold uppercase text-xs mb-2 flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                        Daily Activities
                                    </p>
                                    <p className="text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] pl-3 border-l-2 border-blue-400">
                                        {highlights.dailyActivities || 'Tidak ada catatan aktivitas hari ini.'}
                                    </p>
                                </div>
                                <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
                                    <p className="text-cyan-700 font-bold uppercase text-xs mb-2 flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-cyan-600 rounded-full"></span>
                                        Daily Next Plan
                                    </p>
                                    <p className="text-slate-700 text-[11px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] pl-3 border-l-2 border-cyan-400">
                                        {highlights.dailyNextPlan || 'Tidak ada rencana aktivitas berikutnya.'}
                                    </p>
                                </div>
                            </div>

                            {/* Table Overstay Personnel List */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        Overstay Personnel List (DOB ≥ 21 Hari)
                                    </div>
                                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                                        Total: {overstayPersonnel.length} Personel
                                    </span>
                                </div>
                                <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                    <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '6%' }} />
                                            <col style={{ width: '42%' }} />
                                            <col style={{ width: '34%' }} />
                                            <col style={{ width: '18%' }} />
                                        </colgroup>
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th style={{ width: '6%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                <th style={{ width: '42%' }} className="px-3 py-2">Nama Pekerja</th>
                                                <th style={{ width: '34%' }} className="px-3 py-2">Perusahaan</th>
                                                <th style={{ width: '18%' }} className="px-3 py-2 text-center">Hari On Duty (DOB)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {overstayPersonnel.length > 0 ? (
                                                overstayPersonnel.map((p: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                                                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">{idx + 1}</td>
                                                        <td className="px-3 py-2.5 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{p.name || p.employeeName || '-'}</td>
                                                        <td className="px-3 py-2.5 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{p.company || '-'}</td>
                                                        <td className="px-3 py-2.5 text-center font-bold text-amber-700 align-top">
                                                            {p.dob ? `${p.dob} Hari` : '≥ 21 Hari'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada personel overstay (semua &lt; 21 hari)</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Table HSSE Issues - Open Finding Only */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                                        Table HSSE Issues
                                    </div>
                                    <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                                        Total Issues: {hsseIssues.length}
                                    </span>
                                </div>
                                <div className="w-full overflow-hidden" style={{ width: '100%' }}>
                                    <table className="w-full min-w-full table-fixed text-[10px] text-left" style={{ width: '100%', minWidth: '100%', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '5%' }} />
                                            <col style={{ width: '20%' }} />
                                            <col style={{ width: '13%' }} />
                                            <col style={{ width: '28%' }} />
                                            <col style={{ width: '23%' }} />
                                            <col style={{ width: '11%' }} />
                                        </colgroup>
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th style={{ width: '5%' }} className="px-3 py-2 text-center bg-slate-100">No</th>
                                                <th style={{ width: '20%' }} className="px-3 py-2">Objek / Area Inspeksi</th>
                                                <th style={{ width: '13%' }} className="px-3 py-2 text-center">Status</th>
                                                <th style={{ width: '28%' }} className="px-3 py-2">Deskripsi Temuan</th>
                                                <th style={{ width: '23%' }} className="px-3 py-2">Tindak Lanjut</th>
                                                <th style={{ width: '11%' }} className="px-3 py-2 text-center">Deadline</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {hsseIssues.length > 0 ? (
                                                hsseIssues.map((issue: any, idx: number) => {
                                                    return (
                                                        <tr key={idx} className="hover:bg-red-50/20 transition-colors">
                                                            <td className="px-3 py-2.5 text-center text-slate-400 font-mono bg-slate-50/30 align-top">{idx + 1}</td>
                                                            <td className="px-3 py-2.5 font-semibold text-slate-800 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    {issue.category && (
                                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                                            issue.category === 'Pre-Use' 
                                                                                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                                                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                                                                        }`}>
                                                                            {issue.category}
                                                                        </span>
                                                                    )}
                                                                    <span>{issue.description || '-'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center align-top">
                                                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border inline-flex items-center justify-center max-w-full text-center leading-tight bg-red-50 text-red-700 border-red-200">
                                                                    Open Finding
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-700 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{issue.finding || '-'}</td>
                                                            <td className="px-3 py-2.5 text-slate-600 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{issue.followUp || '-'}</td>
                                                            <td className="px-3 py-2.5 text-center text-slate-500 font-mono align-top whitespace-nowrap">{issue.deadline || '-'}</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="px-3 py-3 text-center text-slate-400 italic">Tidak ada catatan HSSE Issues (semua temuan closed/aman)</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* WEATHER & ENVIRONMENT SECTION: Full Width below Highlights */}
                    <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 p-3.5 border-b border-slate-200">
                            <div className="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
                                <CloudSun className="w-4 h-4" />
                                Weather & Environment
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                            <div className="p-4 text-center">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Wind Speed</div>
                                <div className="flex items-center justify-center gap-2 text-blue-700">
                                    <Wind className="w-5 h-5 text-sky-500" />
                                    <span className="text-base font-bold">{weatherMetrics.wind}</span>
                                </div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Sky Condition</div>
                                <div className="flex items-center justify-center gap-2 text-blue-700">
                                    <Cloud className="w-5 h-5 text-blue-500" />
                                    <span className="text-base font-bold leading-tight break-words">{weatherMetrics.sky}</span>
                                </div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Sea Level</div>
                                <div className="flex items-center justify-center gap-2 text-blue-700">
                                    <Droplets className="w-5 h-5 text-cyan-500" />
                                    <span className="text-base font-bold">{weatherMetrics.sea}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUPPORTING IMAGES SECTION: 3 Columns per Row with Larger Thumbnails */}
                    <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex justify-between items-center">
                            <div className="font-bold text-[#0078D4] flex items-center gap-2 text-sm uppercase tracking-tight">
                                <ImageIcon className="w-4 h-4" />
                                Image Attachments
                            </div>
                            <span className="text-xs text-slate-500 font-medium">Total: {images.length} Lampiran</span>
                        </div>
                        <div className="p-5">
                            {images.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {images.map((img: any, index: number) => (
                                        <div key={index} className="flex flex-col gap-2.5 bg-slate-50/60 p-3 rounded-lg border border-slate-200 shadow-sm">
                                            <div
                                                className="relative bg-slate-100 rounded overflow-hidden border border-slate-200 aspect-[4/3] min-h-[220px] cursor-pointer group/item hover:ring-2 hover:ring-[#0078D4]/50 transition-all flex items-center justify-center p-2"
                                                onClick={() => setSelectedImage(img)}
                                            >
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100 pointer-events-none opacity-0 transition-opacity duration-300 placeholder-container h-full w-full" style={{ zIndex: 1 }}>
                                                    <ImageOff className="w-10 h-10 mb-2 opacity-50" />
                                                    <span className="text-xs uppercase font-bold tracking-widest text-slate-500">Image Not Found</span>
                                                </div>
                                                <img
                                                    src={img.thumbnailUrl || img.url}
                                                    alt={img.fileName || "Attachment"}
                                                    className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 drop-shadow-sm group-hover/item:scale-105"
                                                    onError={(e: any) => {
                                                        if (img.thumbnailUrl && e.target.src !== img.url) {
                                                            e.target.src = img.url;
                                                            return;
                                                        }
                                                        e.target.style.opacity = '0';
                                                        if (e.target.parentElement) {
                                                            const placeholder = e.target.parentElement.querySelector('.placeholder-container');
                                                            if (placeholder) placeholder.style.opacity = '1';
                                                        }
                                                    }}
                                                />
                                                <div className="absolute top-2 left-2 z-20">
                                                    <span className="bg-[#0078D4]/90 text-white text-[9px] px-2 py-0.5 rounded uppercase font-bold backdrop-blur-sm shadow-sm">
                                                        {img.section || 'General'}
                                                    </span>
                                                </div>
                                            </div>
                                            {img.note && <p className="text-xs text-slate-600 font-medium px-1 leading-snug">{img.note}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                                    <ImageOff className="w-10 h-10 mb-2 opacity-20" />
                                    <p className="text-sm italic">No image attachments provided</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Image Preview Modal */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-4xl w-full p-2 bg-slate-950/95 border-slate-800 shadow-2xl">
                    <DialogTitle className="sr-only">Image Preview</DialogTitle>
                    {selectedImage && (
                        <div className="flex flex-col items-center justify-center space-y-3 p-2">
                            <div className="relative w-full overflow-hidden rounded-md flex justify-center bg-black/40 min-h-[50vh] max-h-[85vh]">
                                <img
                                    src={selectedImage.url}
                                    alt={selectedImage.fileName || "Preview"}
                                    className="object-contain w-full h-full max-h-[85vh]"
                                />
                            </div>
                            <div className="flex flex-col items-center text-center max-w-2xl px-4 pb-2">
                                <span className="bg-[#0078D4] text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider mb-2">
                                    {selectedImage.section || 'General'}
                                </span>
                                {selectedImage.note && (
                                    <p className="text-sm text-slate-300 font-medium">
                                        {selectedImage.note}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* POB Personnel Detail Modal */}
            <PobPersonnelModal
                open={pobModalOpen}
                onOpenChange={setPobModalOpen}
                reportId={report?.id}
                reportDate={report?.reportDate ? new Date(report.reportDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined}
                workLocationName={workLocationName}
                pobType={selectedPobType}
                totalCount={selectedPobType === 'phe' ? pobPhe : pobContr}
            />
        </>
    );
};

export default ProjectViewer;
