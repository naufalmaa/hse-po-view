import React, { useState } from 'react';
import { TrendingDown, Clock, ShieldCheck, Ship, Zap, Users, CloudSun, Cloud, Wind, Droplets, Image as ImageIcon, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
    template: Record<string, any>;
    value: Record<string, any>;
    className?: string;
};

const MarineViewer = ({ template, value, className }: Props) => {
    const report = value || {};
    const [selectedImage, setSelectedImage] = useState<any>(null);

    // Format date - DD/MM/YYYY format
    const reportDate = new Date(report.reportDate || new Date());

    // Get lagging indicators
    const lagging = report?.detail?.lagging || {};

    // Manhours
    const safeManhours = 0; // Ideally this would be passed from backend, assuming 0 for now as it needs a complex query
    const ytdManhours = report?.detail?.manhoursSummary?.ytdManhours || 0;

    // Vessel status data (needs to be from backend, using placeholder if empty)
    const vesselStatusData = report?.vesselStatus || [];
    const totalVessels = vesselStatusData.reduce((acc: number, curr: any) => acc + Number(curr.count), 0);

    // Get supporting images
    const rawFiles = report.supportingFiles || report?.detail?.supportingFiles || [];
    const images = rawFiles.filter((f: any) => {
        const isImage = f.fileType && typeof f.fileType === 'string' && f.fileType.startsWith('image/');
        const hasImageExt = f.fileName && typeof f.fileName === 'string' && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.fileName);
        return isImage || hasImageExt;
    });

    const laggingPyramidData = [
        { label: 'Fatality', shortLabel: 'F', val: lagging.fatality || 0, color: 'bg-[#0b1e3b] dark:bg-[#061124]' },
        { label: 'LTI', shortLabel: 'LTI', val: lagging.lti || 0, color: 'bg-[#102a52] dark:bg-[#0c1e3b]' },
        { label: 'MTC', shortLabel: 'MTC', val: lagging.medicalTreatmentCase || 0, color: 'bg-[#163c70] dark:bg-[#102b52]' },
        { label: 'FAC', shortLabel: 'FAC', val: lagging.firstAid || 0, color: 'bg-[#005a9e] dark:bg-[#004275]' },
        { label: 'Nearmiss', shortLabel: 'Nearmiss', val: lagging.nearMiss || 0, color: 'bg-[#0078d4] dark:bg-[#005a9e]' },
        { label: 'Unsafe Act/Cond', shortLabel: 'Unsafe Act/Cond', val: (lagging.unsafeAction || 0) + (lagging.unsafeCondition || 0), color: 'bg-[#0091f2] dark:bg-[#0078d4]' }
    ];

    // Aggregate activities for Marine report
    const marineMeetings: { title: string; count: number }[] = [];
    const marineDrills: { title: string; count: number }[] = [];
    const marineTrainings: { title: string; count: number }[] = [];

    const meetingLabels: any = {
        toolbox: 'Toolbox Meeting',
        toolboxTalk: 'Toolbox Talk',
        generalSafety: 'General Safety Meeting',
        safetyCommittee: 'Safety Committee Meeting',
        preJob: 'Pre-Job Safety Meeting',
        monthlySafety: 'Monthly Safety Meeting',
        hsseSiteOrientation: 'HSSE Site Orientation',
        marineContractorMeeting: 'Marine Contractor Meeting',
        safetyStandDownMeeting: 'Safety Stand Down Meeting',
        managementVisit: 'Management Visit',
        marineSafetyCampaign: 'Marine Safety Campaign',
        learningFromCampaignEvent: 'Learning from Campaign Event',
        others: 'Other Meeting'
    };

    const drillLabels: any = {
        fireDrill: 'Fire Drill',
        abandonDrill: 'Abandon Drill',
        musteringDrill: 'Mustering Drill',
        medievacDrill: 'Medievac Drill',
        h2sDrill: 'H2S Drill',
        oilPollutionPreventionDrill: 'Oil Pollution Prev.',
        steeringGearFailureDrill: 'Steering Gear Failure',
        manOverboardDrill: 'Manoverboard Drill',
        groundingDrill: 'Grounding Drill',
        firstAidDrill: 'First Aid Drill',
        collisionDrill: 'Collision Drill',
        dryDrill: 'Dry Drill',
        wetDrill: 'Wet Drill',
        othersDrill: 'Other Drill'
    };

    const trainingLabels: any = {
        clsr: 'CLSR Training',
        akhlak: 'AKHLAK Training',
        unsafeActionCategory: 'Unsafe Action Category',
        sika: 'SIKA Training',
        l2ra: 'L2RA Training',
        preSiteInduction: 'Pre-Site Induction',
        siteInduction: 'Site Induction',
        shipboardTraining: 'Shipboard Training',
        othersTraining: 'Other Training'
    };

    (report?.detail?.meeting || []).forEach((m: any) => {
        Object.keys(meetingLabels).forEach(key => {
            if (m[key] === 1) {
                marineMeetings.push({ title: meetingLabels[key], count: m.absencePercentage || 0 });
            }
        });
    });

    (report?.detail?.drill || []).forEach((d: any) => {
        Object.keys(drillLabels).forEach(key => {
            if (d[key] === 1) {
                marineDrills.push({ title: drillLabels[key], count: d.totalParticipants || 0 });
            }
        });
    });

    (report?.detail?.training || []).forEach((t: any) => {
        Object.keys(trainingLabels).forEach(key => {
            if (t[key] === 1) {
                marineTrainings.push({ title: trainingLabels[key], count: t.totalParticipants || 0 });
            }
        });
    });

    return (
        <>
            <div className={`p-6 grid grid-cols-12 gap-6 bg-slate-50 dark:bg-slate-900 ${className || ''}`}>
                {/* MARINE GRID */}
                <div className="col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* COLUMN 1: Lagging, Free Days, Manhours */}
                    <div className="flex flex-col gap-6">
                        {/* Lagging Indicators (Pyramid) */}
                        <div className="bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <div className="font-bold text-[#0078D4] dark:text-[#37a2fc] flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <TrendingDown className="w-4 h-4" />
                                    Lagging Indicators
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-center bg-white dark:bg-slate-950 relative">
                                <div className="w-full h-56 relative">
                                    <div className="w-full h-full" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
                                        <div className="flex flex-col h-full w-full">
                                            {laggingPyramidData.map((item, index) => (
                                                <div key={index} className={`${item.color} flex-1 w-full flex items-center justify-center relative border-b border-white/10 dark:border-white/5`}>
                                                    <span className="text-[9px] font-bold z-10 text-white dark:text-gray-100">{item.shortLabel}: {item.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Free Days */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Free LTI (Days)</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-500">{lagging.freeLtaDays || 0}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-950 p-4 rounded border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Free RI (Days)</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-500">{lagging.freeRiDays || 0}</p>
                            </div>
                        </div>

                        {/* Manhours */}
                        <div className="bg-white dark:bg-slate-950 p-5 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Manhours (YTD)</p>
                                <Clock className="w-5 h-5 text-blue-400 dark:text-blue-500" />
                            </div>
                            <p className="text-4xl font-bold text-blue-700 dark:text-blue-500">{Number(ytdManhours).toLocaleString('id-ID')}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-950 p-5 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Safe Manhours</p>
                                <ShieldCheck className="w-5 h-5 text-blue-400 dark:text-blue-500" />
                            </div>
                            <p className="text-4xl font-bold text-blue-700 dark:text-blue-500">{Number(safeManhours).toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    {/* COLUMN 2: Vessel Status, Operational Highlights */}
                    <div className="flex flex-col gap-6">
                        {/* Vessel Status */}
                        <div className="bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <div className="font-bold text-[#0078D4] dark:text-[#37a2fc] flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <Ship className="w-5 h-5" />
                                    Vessel Status
                                </div>
                                <span className="text-[10px] font-bold bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded-full">
                                    Total: {totalVessels}
                                </span>
                            </div>
                            <div className="p-5 space-y-4">
                                {vesselStatusData.map((vc: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{vc.type || 'Other'}</span>
                                        <span className="text-base font-bold text-slate-800 dark:text-slate-100">{vc.count}</span>
                                    </div>
                                ))}
                                {vesselStatusData.length === 0 ? <div className="text-sm text-slate-400 dark:text-slate-500 text-center italic py-4">No active vessels found</div> : null}
                            </div>
                        </div>

                        {/* Operational Highlights */}
                        <div className="bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="font-bold text-[#0078D4] dark:text-[#37a2fc] flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <Zap className="w-5 h-5" />
                                    Operational Highlights
                                </div>
                            </div>
                            <div className="p-5 space-y-6">
                                {['SBU', 'CBU', 'NBU'].map(region => {
                                    const op = report?.detail?.operations?.find((o: any) => o.region === region) || {};
                                    return (
                                        <div key={region}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-500"></span>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase">{region}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 pl-0">
                                                {op.currentHiPoActivity ? <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700">{op.currentHiPoActivity}</span> : null}
                                                {op.forecastHiPoActivity ? <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-3 py-1.5 rounded border border-blue-100 dark:border-blue-800/50">{op.forecastHiPoActivity}</span> : null}
                                                {!op.currentHiPoActivity && !op.forecastHiPoActivity ? <span className="text-sm text-slate-400 dark:text-slate-500 italic">No activity recorded</span> : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: Drills & Meetings, Weather */}
                    <div className="flex flex-col gap-6">
                        {/* Activities */}
                        <div className="bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="font-bold text-[#0078D4] dark:text-[#37a2fc] flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <Users className="w-5 h-5" />
                                    Activities
                                </div>
                            </div>
                            <div className="p-5 space-y-6">
                                {/* Meeting Section */}
                                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Meeting</span>
                                    <div className="space-y-2">
                                        {marineMeetings.length > 0 ? marineMeetings.map((m, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-rubik">{m.title}</span>
                                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold font-rubik">{m.count} Peserta</span>
                                            </div>
                                        )) : <div className="text-sm italic text-slate-400 dark:text-slate-500">No meeting activity recorded</div>}
                                    </div>
                                </div>

                                {/* Training Section */}
                                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Training</span>
                                    <div className="space-y-2">
                                        {marineTrainings.length > 0 ? marineTrainings.map((t, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-rubik">{t.title}</span>
                                                <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 text-[10px] px-2 py-0.5 rounded-full font-bold font-rubik">{t.count} Peserta</span>
                                            </div>
                                        )) : <div className="text-sm italic text-slate-400 dark:text-slate-500">No training activity recorded</div>}
                                    </div>
                                </div>

                                {/* Drill Section */}
                                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Drill</span>
                                    <div className="space-y-2">
                                        {marineDrills.length > 0 ? marineDrills.map((d, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-rubik">{d.title}</span>
                                                <span className="bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-bold font-rubik">{d.count} Peserta</span>
                                            </div>
                                        )) : <div className="text-sm italic text-slate-400 dark:text-slate-500">No drill activity recorded</div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weather Conditions */}
                        <div className="bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="font-bold text-[#0078D4] dark:text-[#37a2fc] flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <CloudSun className="w-5 h-5" />
                                    Weather Conditions
                                </div>
                            </div>
                            <div className="p-5 grid grid-cols-3 gap-2 divide-x divide-slate-100 dark:divide-slate-800">
                                {['SBU', 'CBU', 'NBU'].map(region => {
                                    const op = report?.detail?.operations?.find((o: any) => o.region === region) || {};
                                    return (
                                        <div key={region} className="px-2 first:pl-0">
                                            <div className="text-center font-bold text-slate-700 dark:text-slate-300 text-xs mb-4 bg-slate-50 dark:bg-slate-800 py-1.5 rounded border border-slate-100 dark:border-slate-700">{region}</div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <Droplets className="w-4 h-4 text-blue-400 dark:text-blue-500" />
                                                    <span className="text-slate-600 dark:text-slate-400">{op.seaLevel || '0'}m</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <Wind className="w-4 h-4 text-sky-400 dark:text-sky-500" />
                                                    <span className="text-slate-600 dark:text-slate-400">{op.windSpeed || '0'}kn</span>
                                                </div>
                                                <div className="flex items-start justify-between text-[11px]">
                                                    <Cloud className="w-4 h-4 text-amber-400 mt-0.5" />
                                                    <span className="text-slate-600 dark:text-slate-400 text-right ml-2 leading-tight">{op.skyCondition || 'Clear'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SUPPORTING IMAGES SECTION */}
                <div className="col-span-12 mt-2">
                    <div className="bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="font-bold text-[#0078D4] dark:text-[#37a2fc] flex items-center gap-2 text-sm uppercase tracking-tight">
                                <ImageIcon className="w-4 h-4" />
                                Image Attachments
                            </div>
                        </div>
                        <div className="p-4">
                            {images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {images.map((img: any, index: number) => (
                                        <div key={index} className="flex flex-col gap-2">
                                            <div
                                                className="relative bg-slate-100 dark:bg-slate-800 rounded overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[16/9] cursor-pointer group/item hover:ring-2 hover:ring-[#0078D4]/50 transition-all flex items-center justify-center p-1"
                                                onClick={() => setSelectedImage(img)}
                                            >
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 pointer-events-none opacity-0 transition-opacity duration-300 peer-invalid:opacity-100 placeholder-container h-full w-full" style={{ zIndex: 1 }}>
                                                    <ImageOff className="w-8 h-8 mb-2 opacity-50" />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Image Not Found</span>
                                                </div>
                                                <img
                                                    src={img.thumbnailUrl || img.url}
                                                    alt={img.fileName || "Attachment"}
                                                    className="relative z-10 max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 drop-shadow-sm"
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
                                                    <span className="bg-[#0078D4]/80 text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-bold backdrop-blur-sm shadow-sm">
                                                        {img.section || 'General'}
                                                    </span>
                                                </div>
                                            </div>
                                            {img.note && <p className="text-[10px] text-slate-500 dark:text-slate-400 italic px-1">{img.note}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                                    <ImageOff className="w-8 h-8 mb-2 opacity-20" />
                                    <div className="text-sm italic">No image attachments provided</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Image Preview Modal */}
                <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                    <DialogContent className="max-w-4xl w-full p-2 bg-slate-950/95 border-slate-800 shadow-2xl sm:max-w-[80vh]">
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

            </div>
        </>
    );
};

export default MarineViewer;
