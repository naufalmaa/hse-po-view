import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNavigate } from '@tanstack/react-router';
import { AppRoute } from '@/constants/app-route';
import { useAppTranslation } from "@/lib/i18n-typed";

interface ScoreCellProps {
    v: number | null;
    isFirst?: boolean;
}

const ScoreCell = ({ v, isFirst }: ScoreCellProps) => {
    if (v === null || v === -1) {
        return (
            <div className={cn("h-full w-full flex items-center justify-center", !isFirst && "border-l-2 border-[#D7D3C5] dark:border-stone-800")}>
                <span className="text-[10px] text-[#D7D3C5] dark:text-stone-700">n/a</span>
            </div>
        );
    }

    // Background and text styling based on scores
    let bgColor = "bg-[#F7F5EF] dark:bg-stone-900/30";
    let textColor = "text-[#1F1B14] dark:text-muted-foreground";

    if (v >= 9) {
        bgColor = "bg-[#E8F5E9] dark:bg-green-950/20";
        textColor = "text-[#2E7D32] dark:text-green-400";
    } else if (v >= 6) {
        bgColor = "bg-[#E3F2FD] dark:bg-blue-950/20";
        textColor = "text-[#1565C0] dark:text-blue-400";
    } else {
        bgColor = "bg-[#FFEBEE] dark:bg-red-950/20";
        textColor = "text-[#C62828] dark:text-red-400";
    }

    return (
        <div className={cn("h-full w-full flex items-center justify-center px-1 py-1", !isFirst && "border-l-2 border-[#D7D3C5] dark:border-stone-800")}>
            <span className={cn(
                "inline-block min-w-[28px] px-1 py-0.5 rounded-md text-center text-[10.5px] font-bold",
                bgColor,
                textColor
            )}>
                {v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}
            </span>
        </div>
    );
};

const shortenVendorName = (name: string) => {
    if (!name) return name;

    const words = name.split(' ').filter(Boolean);
    let prefix = "";
    let mainName = name;

    if (words[0]?.toUpperCase() === "PT" || words[0]?.toUpperCase() === "CV") {
        prefix = words[0].toUpperCase() + " ";
        mainName = words.slice(1).join(' ');
    }

    const mainWords = mainName.split(' ').filter(Boolean);
    if (mainWords.length >= 3 || mainName.length > 15) {
        const initials = mainWords.map(w => w[0].toUpperCase()).join('');
        return prefix + initials;
    }

    return name;
};

const getScoreColorClass = (score: number | null) => {
    if (score === null || score === -1) return "text-[#D7D3C5] dark:text-stone-700";
    if (score >= 8.5) return "text-[#2E7D32] dark:text-green-400";
    if (score >= 6) return "text-amber-600 dark:text-amber-500";
    return "text-[#C62828] dark:text-red-400";
};

interface ElementInfo {
    key: string;
    label: string;
    no: string;
    type: 'parent' | 'child';
    fullLabel: string;
    highlight: boolean;
}

interface SemesterTableProps {
    contracts: any[];
    elementLabels: ElementInfo[];
    noDataDesc?: string;
}

const SemesterTable = ({ contracts, elementLabels, noDataDesc }: SemesterTableProps) => {
    const navigate = useNavigate();
    const { t } = useAppTranslation();

    if (!contracts || contracts.length === 0) {
        return (
            <div className="bg-stone-50/50 dark:bg-stone-900/30 border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center text-muted-foreground border border-border mb-2">
                    <span className="text-xl">!</span>
                </div>
                <div className="text-[14px] font-bold text-foreground">
                    {t($ => $.csms.dashboard.scoreBreakdown.noDataTitle)}
                </div>
                <p className="text-muted-foreground text-[12px] max-w-[240px]">
                    {noDataDesc || t($ => $.csms.dashboard.scoreBreakdown.noDataDesc)}
                </p>
            </div>
        );
    }

    const childElements = elementLabels.filter(el => el.type === 'child');

    const vendorGroups = contracts.reduce((acc: any, c: any) => {
        if (!acc[c.vendorName]) acc[c.vendorName] = [];
        acc[c.vendorName].push(c);
        return acc;
    }, {});

    const vendors = Object.entries(vendorGroups).map(([name, items]: [string, any]) => ({
        name,
        shortName: shortenVendorName(name),
        count: items.length,
        items
    }));

    const cols = `46px 280px repeat(${contracts.length}, 90px) 80px`;

    const getAvgFor = (elementName: string) => {
        const vals = contracts.map((c: any) => c.elementScores?.[elementName]).filter((v: any) => v != null && v !== -1);
        return vals.length ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : null;
    };

    const getParentAvgFor = (parentNo: string) => {
        const children = childElements.filter(el => el.no.startsWith(parentNo + '.'));
        if (children.length === 0) return null;

        let sum = 0;
        let count = 0;
        children.forEach(child => {
            const childAvg = getAvgFor(child.fullLabel);
            if (childAvg !== null && childAvg !== -1) {
                sum += childAvg;
                count++;
            }
        });

        return count > 0 ? sum / count : null;
    };

    return (
        <div className="bg-card text-card-foreground border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-auto max-h-[60vh] lg:max-h-[70vh]">
                <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 'max-content' }}>

                    {/* Header */}
                    <div className="p-1.5 text-center bg-[#F4F2EC] dark:bg-stone-900 border-b-2 border-border border-r border-border flex items-center justify-center font-bold text-muted-foreground text-[12px] uppercase tracking-wider sticky top-0 left-0 z-[30]" style={{ gridRow: 'span 2' }}>No</div>
                    <div className="p-1.5 px-4 bg-[#F4F2EC] dark:bg-stone-900 border-b-2 border-border border-r-2 border-border flex items-center justify-center font-bold text-muted-foreground text-[12px] uppercase tracking-wider sticky top-0 left-[46px] z-[30]" style={{ gridRow: 'span 2' }}>Elemen K3LL</div>

                    {vendors.map((v: any, vIdx: number) => (
                        <div key={v.name} className={cn(
                            "px-1.5 py-1 text-center bg-[#F4F2EC] dark:bg-stone-900 border-b border-border flex items-center justify-center font-black text-foreground text-[11.5px] uppercase tracking-tight sticky top-0 z-[20] h-[32px]",
                            vIdx !== 0 && "border-l-2 border-border"
                        )} style={{ gridColumn: `span ${v.count}` }}>
                            <span className="truncate max-w-full px-1" title={v.name}>{v.shortName}</span>
                        </div>
                    ))}

                    <div className="p-1.5 text-center bg-[#F4F2EC] dark:bg-stone-900 border-b-2 border-border border-l-2 border-border flex items-center justify-center font-bold text-muted-foreground text-[12px] uppercase tracking-wider sticky top-0 z-[20]" style={{ gridRow: 'span 2' }}>AVG</div>

                    {contracts.map((c: any, cIdx: number) => (
                        <div key={c.id} className={cn(
                            "px-1.5 py-1 text-center bg-[#F4F2EC] dark:bg-stone-900 border-b-2 border-border flex items-center justify-center min-h-[36px] sticky top-[32px] z-[20]",
                            cIdx !== 0 && "border-l-2 border-border"
                        )}>
                            <div
                                className="text-[10px] text-[#3D4CB7] dark:text-blue-400 font-bold leading-tight line-clamp-3 max-w-[82px] cursor-pointer hover:underline"
                                title={c.vesselName}
                                onClick={() => navigate({ to: AppRoute.csms.contractManagementDetails.url, search: { contractId: c.id } })}
                            >
                                {c.vesselName}
                            </div>
                        </div>
                    ))}

                    {/* Rows */}
                    {elementLabels.map((el, idx) => {
                        const isParent = el.type === 'parent';
                        const totalAvg = isParent ? null : getAvgFor(el.fullLabel);
                        const scoreColorClass = getScoreColorClass(totalAvg);

                        if (isParent) {
                            const hasScores = contracts.some(c => c.elementScores?.[el.fullLabel] != null);
                            const isExcluded = ['3', '4', '5', '6', '7', '8'].includes(el.no);
                            const shouldMerge = !hasScores || isExcluded;

                            return (
                                <div key={el.key} className="contents">
                                    <div className={cn(
                                        "px-1.5 py-1 text-center text-[11.5px] font-black border-b border-border border-r border-border flex items-center justify-center h-full sticky left-0 z-[10]",
                                        el.highlight 
                                            ? "bg-[#FFFDE7] dark:bg-yellow-950/15 text-[#7A5C00] dark:text-yellow-400" 
                                            : "bg-[#F7F5EF] dark:bg-stone-900/30 text-foreground"
                                    )}>{el.no}</div>
                                    <div className={cn(
                                        "px-4 py-2 text-[12px] font-black leading-tight border-b border-border border-r-2 border-border flex items-center h-full sticky left-[46px] z-[10]",
                                        el.highlight 
                                            ? "bg-[#FFFDE7] dark:bg-yellow-950/15 text-[#7A5C00] dark:text-yellow-400" 
                                            : "bg-[#F7F5EF] dark:bg-stone-900/30 text-foreground"
                                    )}>{el.label}</div>

                                    {shouldMerge ? (
                                        <div className={cn(
                                            "border-b border-border border-l border-border h-full",
                                            el.highlight ? "bg-[#FFFDE7] dark:bg-yellow-950/15" : "bg-[#F7F5EF] dark:bg-stone-900/30"
                                        )} style={{ gridColumn: `span ${contracts.length}` }} />
                                    ) : (
                                        contracts.map((c: any, cIdx: number) => (
                                            <div key={c.id} className={cn(
                                                "border-b border-border h-full",
                                                el.highlight ? "bg-[#FFFDE7] dark:bg-yellow-950/15" : "bg-[#F7F5EF] dark:bg-stone-900/30"
                                            )}>
                                                <ScoreCell v={c.elementScores?.[el.fullLabel] ?? null} isFirst={cIdx === 0} />
                                            </div>
                                        ))
                                    )}

                                    <div className={cn(
                                        "px-1 py-1 text-center flex items-center justify-center border-b border-border border-l-2 border-border h-full",
                                        el.highlight ? "bg-[#FFFDE7] dark:bg-yellow-950/15" : "bg-[#F7F5EF] dark:bg-stone-900/30"
                                    )}>
                                        {(() => {
                                            let displayAvg = getParentAvgFor(el.no);

                                            if (displayAvg === null && hasScores) {
                                                displayAvg = getAvgFor(el.fullLabel);
                                            }

                                            if (displayAvg === null) return null;
                                            const scoreClass = getScoreColorClass(displayAvg);
                                            return <span className={cn("text-[11px] font-bold", scoreClass)}>{displayAvg.toFixed(2)}</span>;
                                        })()}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={el.key} className="contents">
                                <div className={cn(
                                    "px-1.5 py-1 text-center text-[11px] font-semibold text-muted-foreground border-b border-border border-r border-border flex items-center justify-center h-full sticky left-0 z-[10]",
                                    el.highlight 
                                        ? "bg-[#FFFDE7] dark:bg-yellow-950/15" 
                                        : (idx % 2 === 0 ? "bg-card dark:bg-[#1a1816]/30" : "bg-[#FDFCF8] dark:bg-stone-900/10")
                                )}>{el.no}</div>
                                <div className={cn(
                                    "px-4 py-2 text-[11.5px] font-medium leading-tight border-b border-border border-r-2 border-border flex items-center h-full sticky left-[46px] z-[10]",
                                    el.highlight 
                                        ? "bg-[#FFFDE7] dark:bg-yellow-950/15 text-[#7A5C00] dark:text-yellow-400 font-bold" 
                                        : "bg-card dark:bg-card text-foreground",
                                    el.no.includes('.') && "pl-6"
                                )}>{el.label}</div>
                                {contracts.map((c: any, cIdx: number) => (
                                    <div key={c.id} className={cn(
                                        "border-b border-border h-full",
                                        el.highlight 
                                            ? "bg-[#FFFDE7] dark:bg-yellow-950/15" 
                                            : (idx % 2 === 0 ? "bg-card dark:bg-[#1a1816]/30" : "bg-[#FDFCF8] dark:bg-stone-900/10")
                                    )}>
                                        <ScoreCell v={c.elementScores?.[el.fullLabel] ?? null} isFirst={cIdx === 0} />
                                    </div>
                                ))}
                                <div className={cn(
                                    "px-1 py-1 text-center flex items-center justify-center border-b border-border border-l-2 border-border h-full",
                                    el.highlight 
                                        ? "bg-[#FFFDE7] dark:bg-yellow-950/15" 
                                        : (idx % 2 === 0 ? "bg-card dark:bg-[#1a1816]/30" : "bg-[#FDFCF8] dark:bg-stone-900/10")
                                )}>
                                    {totalAvg != null ? (
                                        <span className={cn("text-[11px] font-bold", scoreColorClass)}>
                                            {totalAvg.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-[#D7D3C5] dark:text-stone-700">—</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Footer */}
                    <div className="contents">
                        <div className="bg-[#F4F2EC] dark:bg-stone-900 border-t-2 border-border border-r border-border sticky left-0 z-[10]" />
                        <div className="p-1.5 text-[10.5px] font-bold text-foreground bg-[#F4F2EC] dark:bg-stone-900 border-t-2 border-border sticky left-[46px] z-[10]">
                            {t($ => $.csms.dashboard.scoreBreakdown.subTotalTitle)}
                        </div>
                        {contracts.map((c: any) => {
                            const total = c.rencanaK3LLScore;
                            if (total === null || total === -1) {
                                return (
                                    <div key={c.id} className="p-1.5 text-center text-[10.5px] text-[#D7D3C5] dark:text-stone-700 bg-[#F4F2EC] dark:bg-stone-900 border-t-2 border-border border-l border-border flex items-center justify-center">
                                        n/a
                                    </div>
                                );
                            }
                            return (
                                <div key={c.id} className="p-1.5 text-center text-[11px] font-bold text-foreground bg-[#F4F2EC] dark:bg-stone-900 border-t-2 border-border border-l border-border flex items-center justify-center">
                                    {total.toFixed(2)}
                                </div>
                            );
                        })}
                        <div className="p-1.5 text-center text-[11px] font-bold text-foreground bg-[#F4F2EC] dark:bg-stone-900 border-t-2 border-border border-l-2 border-border flex items-center justify-center">
                            {(() => {
                                const vals = contracts.map((c: any) => c.rencanaK3LLScore).filter((v: any) => v != null && v !== -1);
                                const avgTotal = vals.length ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : 0;
                                return avgTotal.toFixed(2);
                            })()}
                        </div>
                    </div>

                    <div className="contents">
                        <div className="bg-[#EEF1F6] dark:bg-blue-950/20 border-t border-border border-r border-border sticky left-0 z-[10]" />
                        <div className="p-1.5 text-[10.5px] font-bold text-foreground bg-[#EEF1F6] dark:bg-blue-950/20 border-t border-border sticky left-[46px] z-[10]">
                            {t($ => $.csms.dashboard.scoreBreakdown.subTotalPercentTitle)}
                        </div>
                        {contracts.map((c: any) => {
                            const total = c.score;
                            if (total === null || total === -1) {
                                return (
                                    <div key={c.id} className="p-1.5 text-center bg-[#EEF1F6] dark:bg-blue-950/20 border-t border-border border-l border-border flex items-center justify-center text-[10.5px] text-[#D7D3C5] dark:text-stone-700">
                                        n/a
                                    </div>
                                );
                            }
                            const pct = total.toFixed(2);
                            const colClass = getScoreColorClass(total);
                            return (
                                <div key={c.id} className="p-1.5 text-center bg-[#EEF1F6] dark:bg-blue-950/20 border-t border-border border-l border-border flex items-center justify-center">
                                    <span className={cn("text-[11px] font-bold", colClass)}>{pct}%</span>
                                </div>
                            );
                        })}
                        <div className="p-1.5 text-center bg-[#EEF1F6] dark:bg-blue-950/20 border-t border-border border-l-2 border-border flex items-center justify-center">
                            {(() => {
                                const vals = contracts.map((c: any) => c.score).filter((v: any) => v != null && v !== -1);
                                const avgTotal = vals.length ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : 0;
                                const pct = avgTotal.toFixed(2);
                                const colClass = getScoreColorClass(avgTotal);
                                return <span className={cn("text-[11px] font-bold", colClass)}>{pct}%</span>;
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ElementScoreBreakdownProps {
    data: {
        elements: string[];
        semester1: any[];
        semester2: any[];
        penilaianAkhir?: any[];
    };
    semesterLabel: string;
}

const ElementScoreBreakdown = ({ data, semesterLabel }: ElementScoreBreakdownProps) => {
    const { t } = useAppTranslation();
    const [activeTab, setActiveTab] = useState('1');

    // Extract year from semesterLabel (e.g., "Tahun 2026" -> "2026")
    const year = semesterLabel.replace(/[^0-9]/g, '');

    // Process element labels from backend data
    const elementLabels: ElementInfo[] = (data.elements || []).map(elString => {
        const spaceIdx = elString.indexOf(' ');
        const no = spaceIdx !== -1 ? elString.substring(0, spaceIdx) : elString;
        const label = spaceIdx !== -1 ? elString.substring(spaceIdx + 1) : '';
        const type = no.includes('.') ? 'child' : 'parent';

        return {
            key: no,
            no,
            label,
            type: type as 'parent' | 'child',
            fullLabel: elString,
            highlight: type === 'parent'
        };
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="px-1 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <span className="text-[15px] font-black text-foreground border-l-4 border-[#3D4CB7] pl-3">
                        {t($ => $.csms.dashboard.scoreBreakdown.title)}
                    </span>
                    <span className="text-[12px] text-muted-foreground ml-1">
                        {t($ => $.csms.dashboard.scoreBreakdown.subtitle)}
                    </span>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex justify-start w-full rounded-xl bg-[#F4F2EC] dark:bg-stone-900 p-1 h-auto gap-1 mb-4 border border-border max-w-fit ml-1">
                    <TabsTrigger
                        value="1"
                        className="px-4 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-stone-850 data-[state=active]:text-[#3D4CB7] dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm text-[12px] font-bold text-muted-foreground transition-all"
                    >
                        {t($ => $.csms.dashboard.scoreBreakdown.pb1Label).replace('{{year}}', year)}
                    </TabsTrigger>
                    <TabsTrigger
                        value="2"
                        className="px-4 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-stone-850 data-[state=active]:text-[#3D4CB7] dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm text-[12px] font-bold text-muted-foreground transition-all"
                    >
                        {t($ => $.csms.dashboard.scoreBreakdown.pb2Label).replace('{{year}}', year)}
                    </TabsTrigger>
                    <TabsTrigger
                        value="3"
                        className="px-4 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-stone-850 data-[state=active]:text-[#3D4CB7] dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm text-[12px] font-bold text-muted-foreground transition-all"
                    >
                        {t($ => $.csms.dashboard.scoreBreakdown.paLabel).replace('{{year}}', year)}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="1" className="mt-0 outline-none">
                    <SemesterTable contracts={data.semester1} elementLabels={elementLabels} />
                </TabsContent>
                <TabsContent value="2" className="mt-0 outline-none">
                    <SemesterTable contracts={data.semester2} elementLabels={elementLabels} />
                </TabsContent>
                <TabsContent value="3" className="mt-0 outline-none">
                    <SemesterTable 
                        contracts={data.penilaianAkhir || []} 
                        elementLabels={elementLabels} 
                        noDataDesc="Belum ada rincian penilaian akhir (PA) untuk periode tahun ini."
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ElementScoreBreakdown;
