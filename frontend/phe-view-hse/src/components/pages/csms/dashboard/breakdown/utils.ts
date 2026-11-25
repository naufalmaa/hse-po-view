export const getComplianceTier = (score: number | null) => {
    if (score == null) return 'none';
    if (score >= 80) return 'good';
    if (score >= 60) return 'warn';
    return 'crit';
};

export const getTierClasses = (tier: 'good' | 'warn' | 'crit' | 'none') => {
    const maps = {
        good: {
            container: "bg-gradient-to-b from-[#F2FAF5] to-white dark:from-green-950/10 dark:to-stone-900/10 border-[#9BD3B0] dark:border-green-900/30",
            text: "text-[#1F8A4F] dark:text-green-400",
            dot: "bg-[#22A85F] dark:bg-green-500",
            badge: "bg-[#E7F5EC] dark:bg-green-950/30 text-[#1F8A4F] dark:text-green-400 border-[#9BD3B0] dark:border-green-900/30",
            ring: "border-[#9BD3B0] dark:border-green-900/40"
        },
        warn: {
            container: "bg-gradient-to-b from-[#FFF9EB] to-white dark:from-amber-950/10 dark:to-stone-900/10 border-[#F2C97A] dark:border-amber-900/30",
            text: "text-[#A06A00] dark:text-amber-400",
            dot: "bg-[#E0A024] dark:bg-amber-500",
            badge: "bg-[#FFF4DB] dark:bg-amber-950/30 text-[#A06A00] dark:text-amber-400 border-[#F2C97A] dark:border-amber-900/30",
            ring: "border-[#F2C97A] dark:border-amber-900/40"
        },
        crit: {
            container: "bg-gradient-to-b from-[#FEF1ED] to-white dark:from-red-950/10 dark:to-stone-900/10 border-[#F2A89A] dark:border-red-900/30",
            text: "text-[#B0331C] dark:text-red-400",
            dot: "bg-[#D9462B] dark:bg-red-500",
            badge: "bg-[#FEE7E2] dark:bg-red-950/30 text-[#B0331C] dark:text-red-400 border-[#F2A89A] dark:border-red-900/30",
            ring: "border-[#F2A89A] dark:border-red-900/40"
        },
        none: {
            container: "bg-gradient-to-b from-[#FAF9F4] to-white dark:from-stone-950/10 dark:to-stone-900/10 border-[#E2DFD5] dark:border-stone-800",
            text: "text-[#7A7468] dark:text-muted-foreground",
            dot: "bg-[#A8A294] dark:bg-stone-500",
            badge: "bg-[#F4F2EC] dark:bg-stone-950/30 text-[#7A7468] dark:text-muted-foreground border-[#E2DFD5] dark:border-stone-800",
            ring: "border-[#E2DFD5] dark:border-stone-800"
        }
    };
    return maps[tier] || maps.none;
};
