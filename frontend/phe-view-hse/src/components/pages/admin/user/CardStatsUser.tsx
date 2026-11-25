import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, User, Settings, Ship, Briefcase } from 'lucide-react';
import { useAppTranslation } from "@/lib/i18n-typed";

interface CardStatsUserProps {
  summary?: {
    admin: number;
    user: number;
    contractor: number;
    crew: number;
    employee: number;
  };
  isLoading: boolean;
}

export const CardStatsUser: React.FC<CardStatsUserProps> = ({ summary, isLoading }) => {
  const { t } = useAppTranslation();

  const stats = [
    {
      title: t($ => $.admin.users.stats.admin),
      value: isLoading ? '-' : summary?.admin || 0,
      icon: Shield,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-200',
      subTextColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: t($ => $.admin.users.stats.user),
      value: isLoading ? '-' : summary?.user || 0,
      icon: User,
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-800 dark:text-green-200',
      subTextColor: 'text-green-600 dark:text-green-400'
    },
    {
      title: t($ => $.admin.users.stats.contractor),
      value: isLoading ? '-' : summary?.contractor || 0,
      icon: Settings,
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      borderColor: 'border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-800 dark:text-purple-200',
      subTextColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: t($ => $.admin.users.stats.crew),
      value: isLoading ? '-' : summary?.crew || 0,
      icon: Ship,
      color: 'orange',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-800 dark:text-orange-200',
      subTextColor: 'text-orange-600 dark:text-orange-400'
    },
    {
      title: t($ => $.admin.users.stats.employee),
      value: isLoading ? '-' : summary?.employee || 0,
      icon: Briefcase,
      color: 'cyan',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
      borderColor: 'border-cyan-200 dark:border-cyan-800',
      textColor: 'text-cyan-800 dark:text-cyan-200',
      subTextColor: 'text-cyan-600 dark:text-cyan-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className={`${stat.borderColor} ${stat.bgColor} p-0 border`}
          >
            <CardContent className="p-4">
              <div className={stat.textColor}>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {stat.title}
                </h3>
                <div className='flex flex-row items-center gap-4 my-2'>
                  <Icon className={`h-5 w-5 ${stat.textColor}`} />
                  <p className="text-3xl font-bold">
                    {stat.value}
                  </p>
                </div>
                {/* <p className={`text-sm ${stat.subTextColor} mt-1`}>
                  {t('admin.users.stats.users')}
                </p> */}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};