import React, { useState, useMemo } from 'react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

import {
    CompletionRateItemExtended,
    YearCompletionRateBreakdownExtended
} from './breakdown/types';
import ContractCard from './breakdown/ContractCard';
import VendorGroup from './breakdown/VendorGroup';
import SemesterSummary from './breakdown/SemesterSummary';
import StatusGroup from './breakdown/StatusGroup';
import TypeGroup from './breakdown/TypeGroup';

interface CompletionRateBreakdownProps {
    data: YearCompletionRateBreakdownExtended[];
}

const CompletionRateBreakdown: React.FC<CompletionRateBreakdownProps> = ({ data }) => {
    const { t } = useAppTranslation();
    const navigate = useNavigate();

    // Filters & Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'ongoing'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
    const [groupBy, setGroupBy] = useState<'vendor' | 'status' | 'type' | 'none'>('vendor');

    // Filtered and Sorted Data
    const processedData = useMemo(() => {
        if (!data) return [];
        return data.map(yearData => {
            const processItems = (items: CompletionRateItemExtended[]) => {
                let filtered = [...(items || [])];

                // 1. Search
                if (searchTerm) {
                    const lowSearch = searchTerm.toLowerCase();
                    filtered = filtered.filter(i =>
                        i.contractTitle.toLowerCase().includes(lowSearch) ||
                        i.contractNumber.toLowerCase().includes(lowSearch) ||
                        (i.vendorName || '').toLowerCase().includes(lowSearch) ||
                        (i.vesselName || '').toLowerCase().includes(lowSearch)
                    );
                }

                // 2. Status
                if (statusFilter !== 'all') {
                    const target = statusFilter === 'completed';
                    filtered = filtered.filter(i => i.isFinal === target);
                }

                // 3. Sort
                filtered.sort((a, b) => {
                    if (sortBy === 'name') return a.contractTitle.localeCompare(b.contractTitle);
                    const dateA = new Date(a.dateAssessment).getTime();
                    const dateB = new Date(b.dateAssessment).getTime();
                    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
                });

                return filtered;
            };

            return {
                ...yearData,
                semester1: { ...yearData.semester1, items: processItems(yearData.semester1.items) },
                semester2: { ...yearData.semester2, items: processItems(yearData.semester2.items) }
            };
        });
    }, [data, searchTerm, statusFilter, sortBy]);

    // Aggregate counts for filter buttons
    const counts = useMemo(() => {
        let all = 0, completed = 0, ongoing = 0;
        data?.forEach(y => {
            [...y.semester1.items, ...y.semester2.items].forEach(i => {
                all++;
                if (i.isFinal) completed++;
                else ongoing++;
            });
        });
        return { all, completed, ongoing };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-slate-500 dark:text-slate-500 font-medium">{t($ => $.csms.dashboard.noTimelineData)}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <span className="text-[15px] font-black text-foreground border-l-4 border-[#3D4CB7] pl-3">
                        {t($ => $.csms.dashboard.breakdown.title)}
                    </span>
                    <span className="text-[12px] text-muted-foreground ml-1">
                        {t($ => $.csms.dashboard.breakdown.subtitle)}
                    </span>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input
                            type="text"
                            placeholder={t($ => $.csms.dashboard.breakdown.searchPlaceholder)}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-[#FBFAF5] dark:bg-[#1c1917]/50 border border-border rounded-lg text-[12.5px] text-foreground placeholder:text-[#A8A294] dark:placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[#3D6FE8] focus:border-[#3D6FE8] transition-all"
                        />
                    </div>

                    {/* Status Buttons */}
                    <div className="flex gap-1 p-1 bg-[#F5F3EF] dark:bg-stone-900/50 rounded-lg border border-border">
                        {[
                            { id: 'all', label: t($ => $.csms.dashboard.breakdown.filterAll), count: counts.all },
                            { id: 'completed', label: t($ => $.csms.dashboard.breakdown.filterCompleted), count: counts.completed },
                            { id: 'ongoing', label: t($ => $.csms.dashboard.breakdown.filterOngoing), count: counts.ongoing }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setStatusFilter(s.id as any)}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[11.5px] font-bold transition-all flex items-center gap-1.5",
                                    statusFilter === s.id
                                        ? "bg-white dark:bg-[#2e2a24] text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-[#2e2a24]/50"
                                )}
                            >
                                {s.label}
                                <span className={cn(
                                    "text-[10px] px-1 rounded-sm",
                                    statusFilter === s.id ? "bg-[#EFF3FB] dark:bg-blue-950/40 text-[#3D6FE8] dark:text-blue-400" : "bg-[#ECEAE2] dark:bg-stone-850 text-muted-foreground"
                                )}>
                                    {s.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Group By Selector */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#F5F3EF] dark:bg-stone-900/50 rounded-lg border border-border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {t($ => $.csms.dashboard.breakdown.groupLabel)}
                        </span>
                        <div className="flex gap-1">
                            {[
                                { id: 'vendor', label: t($ => $.csms.dashboard.breakdown.groupVendor) },
                                { id: 'status', label: t($ => $.csms.dashboard.breakdown.groupStatus) },
                                { id: 'type', label: t($ => $.csms.dashboard.breakdown.groupType) },
                                { id: 'none', label: t($ => $.csms.dashboard.breakdown.groupNone) }
                            ].map((g) => (
                                <button
                                    key={g.id}
                                    onClick={() => setGroupBy(g.id as any)}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[10.5px] font-bold transition-all",
                                        groupBy === g.id ? "bg-[#3D6FE8] dark:bg-blue-600 text-white" : "text-muted-foreground hover:bg-white dark:hover:bg-[#2e2a24]"
                                    )}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative group">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none pl-8 pr-8 py-1.5 bg-[#FBFAF5] dark:bg-[#1c1917]/50 border border-border rounded-lg text-[12.5px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-[#3D6FE8] transition-all cursor-pointer"
                        >
                            <option value="newest">{t($ => $.csms.dashboard.breakdown.sortNewest)}</option>
                            <option value="oldest">{t($ => $.csms.dashboard.breakdown.sortOldest)}</option>
                            <option value="name">{t($ => $.csms.dashboard.breakdown.sortName)}</option>
                        </select>
                        <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            <Filter size={12} />
                        </div>
                    </div>
                </div>
            </div>

            {processedData.map((yearData) => (
                <div key={yearData.year} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Semester I */}
                        <div className="flex flex-col gap-3">
                            <SemesterSummary semester={1} data={yearData.semester1} year={yearData.year} t={t} />
                            <div className="bg-[#FBFAF5] dark:bg-stone-900/10 border border-border rounded-xl p-3 max-h-[720px] overflow-y-auto space-y-4">
                                {yearData.semester1.items && yearData.semester1.items.length > 0 ? (
                                    groupBy === 'vendor' ? (
                                        Object.entries(
                                            yearData.semester1.items.reduce((acc, item) => {
                                                const vendor = item.vendorName || 'Tanpa Vendor';
                                                if (!acc[vendor]) acc[vendor] = [];
                                                acc[vendor].push(item);
                                                return acc;
                                            }, {} as Record<string, CompletionRateItemExtended[]>)
                                        ).map(([vendor, vendorItems]) => (
                                            <VendorGroup key={vendor} vendor={vendor} items={vendorItems} navigate={navigate} />
                                        ))
                                    ) : groupBy === 'status' ? (
                                        Object.entries(
                                            yearData.semester1.items.reduce((acc, item) => {
                                                const status = item.isComplete ? 'completed' : 'ongoing';
                                                if (!acc[status]) acc[status] = [];
                                                acc[status].push(item);
                                                return acc;
                                            }, {} as Record<string, CompletionRateItemExtended[]>)
                                        ).map(([status, statusItems]) => (
                                            <StatusGroup key={status} status={status as any} items={statusItems} navigate={navigate} />
                                        ))
                                    ) : groupBy === 'type' ? (
                                        Object.entries(
                                            yearData.semester1.items.reduce((acc, item) => {
                                                const isPB = item.contractfolderName?.toUpperCase().includes('PB') || item.contractfolderName?.toUpperCase().includes('BERJALAN');
                                                const typeKey = isPB ? 'PB' : 'PA';
                                                if (!acc[typeKey]) acc[typeKey] = [];
                                                acc[typeKey].push(item);
                                                return acc;
                                            }, {} as Record<string, CompletionRateItemExtended[]>)
                                        )
                                            .sort(([a], [b]) => b.localeCompare(a))
                                            .map(([typeKey, typeItems]) => (
                                                <TypeGroup key={typeKey} type={typeKey} items={typeItems} navigate={navigate} />
                                            ))
                                    ) : (
                                        <div className="space-y-2">
                                            {yearData.semester1.items.map((item, idx) => (
                                                <ContractCard key={`${item.contractId}-${idx}`} item={item} navigate={navigate} />
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground text-[12.5px] border border-dashed border-border rounded-xl bg-card">
                                        {searchTerm || statusFilter !== 'all' ? t($ => $.csms.dashboard.breakdown.noFilteredData) : t($ => $.csms.dashboard.completionRate.noData)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Semester II */}
                        <div className="flex flex-col gap-3">
                            <SemesterSummary semester={2} data={yearData.semester2} year={yearData.year} t={t} />
                            <div className="bg-[#FBFAF5] dark:bg-stone-900/10 border border-border rounded-xl p-3 max-h-[720px] overflow-y-auto space-y-4">
                                {yearData.semester2.items && yearData.semester2.items.length > 0 ? (
                                    groupBy === 'vendor' ? (
                                        Object.entries(
                                            yearData.semester2.items.reduce((acc, item) => {
                                                const vendor = item.vendorName || 'Tanpa Vendor';
                                                if (!acc[vendor]) acc[vendor] = [];
                                                acc[vendor].push(item);
                                                return acc;
                                            }, {} as Record<string, CompletionRateItemExtended[]>)
                                        ).map(([vendor, vendorItems]) => (
                                            <VendorGroup key={vendor} vendor={vendor} items={vendorItems} navigate={navigate} />
                                        ))
                                    ) : groupBy === 'status' ? (
                                        Object.entries(
                                            yearData.semester2.items.reduce((acc, item) => {
                                                const status = item.isComplete ? 'completed' : 'ongoing';
                                                if (!acc[status]) acc[status] = [];
                                                acc[status].push(item);
                                                return acc;
                                            }, {} as Record<string, CompletionRateItemExtended[]>)
                                        ).map(([status, statusItems]) => (
                                            <StatusGroup key={status} status={status as any} items={statusItems} navigate={navigate} />
                                        ))
                                    ) : groupBy === 'type' ? (
                                        Object.entries(
                                            yearData.semester2.items.reduce((acc, item) => {
                                                const isPB = item.contractfolderName?.toUpperCase().includes('PB') || item.contractfolderName?.toUpperCase().includes('BERJALAN');
                                                const typeKey = isPB ? 'PB' : 'PA';
                                                if (!acc[typeKey]) acc[typeKey] = [];
                                                acc[typeKey].push(item);
                                                return acc;
                                            }, {} as Record<string, CompletionRateItemExtended[]>)
                                        )
                                            .sort(([a], [b]) => b.localeCompare(a))
                                            .map(([typeKey, typeItems]) => (
                                                <TypeGroup key={typeKey} type={typeKey} items={typeItems} navigate={navigate} />
                                            ))
                                    ) : (
                                        <div className="space-y-2">
                                            {yearData.semester2.items.map((item, idx) => (
                                                <ContractCard key={`${item.contractId}-${idx}`} item={item} navigate={navigate} />
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground text-[12.5px] border border-dashed border-border rounded-xl bg-card">
                                        {searchTerm || statusFilter !== 'all' ? t($ => $.csms.dashboard.breakdown.noFilteredData) : t($ => $.csms.dashboard.completionRate.noData)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
export default CompletionRateBreakdown;
