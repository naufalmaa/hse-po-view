import React from 'react';
import { Target, TrendingUp, CheckCircle2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/lib/i18n-typed';

interface PerformanceAnalyticsProps {
  data?: {
    pbSemester1: number;
    pbSemester2: number;
    paYearly: number;
    totalPerformance: number;
  };
  year?: number | null;
  isLoading?: boolean;
}

const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ data, year, isLoading }) => {
  const { t } = useAppTranslation();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#FBFAF5] dark:bg-muted/10 animate-pulse rounded-2xl border border-[#ECEAE2] dark:border-border" />
          ))}
        </div>
        <div className="w-[240px] h-32 bg-[#1F1B14] dark:bg-[#15120E] border border-[#3A352A] dark:border-border animate-pulse rounded-2xl" />
      </div>
    );
  }

  const metrics = [
    {
      label: `${t($ => $.csms.dashboard.performance.pbSemester1)}\n${year || ''}`,
      value: data.pbSemester1,
      icon: Target,
      color: '#3D6FE8',
      className: 'bg-[#EFF3FB] dark:bg-blue-950/20 text-[#3D6FE8] dark:text-blue-400 border-[#ECEAE2] dark:border-blue-900/30'
    },
    {
      label: `${t($ => $.csms.dashboard.performance.pbSemester2)}\n${year || ''}`,
      value: data.pbSemester2,
      icon: TrendingUp,
      color: '#B85B1A',
      className: 'bg-[#FFF7EE] dark:bg-amber-950/20 text-[#B85B1A] dark:text-amber-400 border-[#ECEAE2] dark:border-amber-900/30'
    },
    {
      label: `${t($ => $.csms.dashboard.performance.paYearly)}\n${year || ''}`,
      value: data.paYearly,
      icon: CheckCircle2,
      color: '#1F8A4F',
      className: 'bg-[#F2FAF5] dark:bg-emerald-950/20 text-[#1F8A4F] dark:text-emerald-400 border-[#ECEAE2] dark:border-emerald-900/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 mb-6">
      {/* Small Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className={cn(
              "border rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300",
              m.className
            )}
          >
            {/* Background Decorative Icon */}
            <div
              className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 opacity-[0.05] transition-transform duration-500 group-hover:scale-110"
              style={{ color: m.color }}
            >
              <m.icon size={80} />
            </div>

            <div className="flex flex-col gap-2 relative z-10">
              <div className="flex items-center gap-2.5 text-[#7A7468] dark:text-muted-foreground">
                <div className="p-2 rounded-lg bg-white/80 dark:bg-stone-900/80 shadow-sm" style={{ color: m.color }}>
                  <m.icon size={16} />
                </div>
                <span className="text-[12px] font-bold uppercase tracking-wider whitespace-pre-line leading-tight">{m.label}</span>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-foreground text-4xl font-black tabular-nums tracking-tight">
                  {m.value}
                </span>
                <span className="text-foreground text-sm font-bold opacity-40">%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Score Card */}
      <div className="bg-[#1F1B14] dark:bg-[#15120E] rounded-2xl p-3 flex flex-row lg:flex-col items-center justify-center gap-4 lg:gap-1 min-w-[220px] relative overflow-hidden shadow-xl border border-[#3A352A] dark:border-border">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-4 -right-4 text-white opacity-[0.05]">
          <Award size={80} />
        </div>

        <div className="flex flex-col items-center lg:items-center">
          <div className="text-[10px] font-bold text-[#A8A294] dark:text-muted-foreground uppercase tracking-[0.15em]">
            {t($ => $.csms.dashboard.performance.totalPerformance)}
          </div>
          <div className="text-[11px] font-semibold text-[#D7D3C5] dark:text-foreground mb-1">
            {t($ => $.csms.dashboard.performance.csmsImplementation)}
          </div>
        </div>

        <div className="flex items-center justify-center py-2">
          <span className="text-4xl font-black text-white">{data.totalPerformance}%</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
