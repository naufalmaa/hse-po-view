import { UnmatchedLogDetail } from "@/service/employee/pob/pob-unmatched-logs";
import { FileQuestion, CheckCircle2, SearchX, Target } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n-typed";

interface PobUnmatchedStatsProps {
    data: UnmatchedLogDetail;
}

export function PobUnmatchedStats({ data }: PobUnmatchedStatsProps) {
    const { t } = useAppTranslation();
    const totalEntries = data.summary?.totalUnmatched ?? data.data.length;
    const withSuggestions = data.summary?.withSuggestion ?? data.data.filter(item => item.suggestions.length > 0).length;
    const noSuggestions = data.summary?.withoutSuggestion ?? (totalEntries - withSuggestions);
    const highConfidence = data.summary?.highCertainty ?? data.data.filter(item => item.suggestions.some(s => s.similarity > 0.8)).length;

    const stats = [
        {
            title: t($ => $.pobUnmatchedDetails.stats.totalUnmatched),
            value: totalEntries,
            icon: FileQuestion,
            className: "bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 text-white",
            iconClassName: "text-white",
            description: t($ => $.pobUnmatchedDetails.stats.totalUnmatchedDesc)
        },
        {
            title: t($ => $.pobUnmatchedDetails.stats.withSuggestions),
            value: withSuggestions,
            icon: CheckCircle2,
            className: "bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800 text-white",
            iconClassName: "text-white",
            description: t($ => $.pobUnmatchedDetails.stats.withSuggestionsDesc)
        },
        {
            title: t($ => $.pobUnmatchedDetails.stats.highConfidence),
            value: highConfidence,
            icon: Target,
            className: "bg-gradient-to-br from-amber-500 to-amber-700 dark:from-amber-600 dark:to-amber-800 text-white",
            iconClassName: "text-white",
            description: t($ => $.pobUnmatchedDetails.stats.highConfidenceDesc)
        },
        {
            title: t($ => $.pobUnmatchedDetails.stats.noSuggestions),
            value: noSuggestions,
            icon: SearchX,
            className: "bg-gradient-to-br from-rose-500 to-rose-700 dark:from-rose-600 dark:to-rose-800 text-white",
            iconClassName: "text-white",
            description: t($ => $.pobUnmatchedDetails.stats.noSuggestionsDesc)
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className={`${stat.className} rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-default h-full`}
                >
                    <div className="p-6 relative h-full flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                                <stat.icon className={`w-6 h-6 ${stat.iconClassName}`} />
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold drop-shadow-sm">{stat.value}</p>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <h3 className="font-semibold text-lg mb-1 drop-shadow-sm">{stat.title}</h3>
                            <p className="text-xs opacity-90 drop-shadow-sm">{stat.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}