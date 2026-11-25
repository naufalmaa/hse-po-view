import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, User, Badge, Filter } from 'lucide-react';
import { ObservationStatistics } from '@/service/employee/smart-card';
import { useAppTranslation } from "@/lib/i18n-typed";

interface CardStatsProps {
    statistics?: { data: ObservationStatistics };
    isStatsLoading: boolean;
}

export const CardStats: React.FC<CardStatsProps> = ({ statistics, isStatsLoading }) => {
    const { t } = useAppTranslation();
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-0">
                <CardContent className="p-4">
                    <div className="text-blue-800 dark:text-blue-200">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            {t($ => $.smartCard.stats.totalEmployees)}
                        </h3>
                        <div className='flex flex-row items-center gap-4 my-2'>
                            <Users className="h-5 w-5" />
                            <p className="text-3xl font-bold">
                                {isStatsLoading ? '-' : statistics?.data?.totalAllEmployees || 0}
                            </p>
                        </div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{t($ => $.smartCard.stats.allEmployees)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-0">
                <CardContent className="p-4">
                    <div className="text-green-800 dark:text-green-200">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            {t($ => $.smartCard.stats.activeEmployees)}
                        </h3>
                        <div className='flex flex-row items-center gap-4 my-2'>
                            <User className="h-5 w-5" />
                            <p className="text-3xl font-bold">
                                {isStatsLoading ? '-' : statistics?.data?.totalActiveEmployees || 0}
                            </p>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">{t($ => $.smartCard.stats.currentlyActive)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 p-0">
                <CardContent className="p-4">
                    <div className="text-purple-800 dark:text-purple-200">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            {t($ => $.smartCard.stats.sudahMengisi)}
                        </h3>
                        <div className='flex flex-row items-center gap-4 my-2'>
                            <Badge className="h-5 w-5" />
                            <p className="text-3xl font-bold">
                                {isStatsLoading ? '-' : statistics?.data?.employeesWithObservations || 0}
                            </p>
                        </div>
                        <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{t($ => $.smartCard.stats.haveFilledForms)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 p-0">
                <CardContent className="p-4">
                    <div className="text-orange-800 dark:text-orange-200">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            {t($ => $.smartCard.stats.belumMengisi)}
                        </h3>
                        <div className='flex flex-row items-center gap-4 my-2'>
                            <Filter className="h-5 w-5" />
                            <p className="text-3xl font-bold">
                                {isStatsLoading ? '-' : statistics?.data?.employeesWithoutObservations || 0}
                            </p>
                        </div>
                        <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">{t($ => $.smartCard.stats.needToFill)}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};