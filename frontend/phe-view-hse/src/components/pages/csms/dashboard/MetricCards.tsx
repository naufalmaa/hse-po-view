import { useAppTranslation } from "@/lib/i18n-typed";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { to_decimal_formatted } from "@/lib/my-utils";

interface Metric {
  title: string;
  value: string;
  subtitle?: string;
  subValue?: string;
  color: string;
  darkColor: string;
  border: string;
  darkBorder: string;
  textColor: string;
  darkTextColor: string;
  bgColor: string;
  darkBgColor: string;
}

interface MetricCardsProps {
  dashboardData: any;
}

export default function MetricCards({ dashboardData }: MetricCardsProps) {
  const { t } = useAppTranslation();

  // Metric cards data
  const metrics: Metric[] = [
    // {
    //   title: t($ => $.csms.dashboard.stats.totalFilesUploaded),
    //   value: to_decimal_formatted(dashboardData?.totalFilesUploaded ?? 0, 0),
    //   color: "from-blue-50 to-blue-100",
    //   darkColor: "from-blue-900/30 to-blue-900/20",
    //   border: "border-blue-200",
    //   darkBorder: "dark:border-blue-800",
    //   textColor: "text-blue-800",
    //   darkTextColor: "dark:text-blue-200",
    //   bgColor: "bg-blue-50",
    //   darkBgColor: "dark:bg-blue-900/20"
    // },
    // {
    //   title: t($ => $.csms.dashboard.stats.qualificationNotExpired),
    //   value: to_decimal_formatted(dashboardData?.qualificationAssessments?.notExpired ?? 0, 0),
    //   subtitle: t($ => $.csms.dashboard.stats.qualificationExpired),
    //   subValue: to_decimal_formatted(dashboardData?.qualificationAssessments?.expired ?? 0, 0),
    //   color: "from-orange-50 to-orange-100",
    //   darkColor: "from-orange-900/30 to-orange-900/20",
    //   border: "border-orange-200",
    //   darkBorder: "dark:border-orange-800",
    //   textColor: "text-orange-800",
    //   darkTextColor: "dark:text-orange-200",
    //   bgColor: "bg-orange-50",
    //   darkBgColor: "dark:bg-orange-900/20"
    // },
    {
      title: t($ => $.csms.dashboard.stats.contractsOngoingAssessments),
      value: to_decimal_formatted(dashboardData?.contracts?.withOngoingAssessments ?? 0, 0),
      subtitle: t($ => $.csms.dashboard.stats.contractsAllFoldersComplete),
      subValue: to_decimal_formatted(dashboardData?.contracts?.withAllFoldersComplete ?? 0, 0),
      color: "from-purple-50 to-purple-100",
      darkColor: "from-purple-900/30 to-purple-900/20",
      border: "border-purple-200",
      darkBorder: "dark:border-purple-800",
      textColor: "text-purple-800",
      darkTextColor: "dark:text-purple-200",
      bgColor: "bg-purple-50",
      darkBgColor: "dark:bg-purple-900/20"
    },
    {
      title: t($ => $.csms.dashboard.charts.incomingActivities),
      value: to_decimal_formatted(dashboardData?.incomingActivitiesCount ?? 0, 0),
      color: "from-amber-50 to-amber-100",
      darkColor: "from-amber-900/30 to-amber-900/20",
      border: "border-amber-200",
      darkBorder: "dark:border-amber-800",
      textColor: "text-amber-800",
      darkTextColor: "dark:text-amber-200",
      bgColor: "bg-amber-50",
      darkBgColor: "dark:bg-amber-900/20"
    },
    // {
    //   title: t($ => $.csms.dashboard.stats.completionRate),
    //   value: `${to_decimal_formatted(Math.round(dashboardData?.completionPercentage ?? 0), 0)}%`,
    //   color: "from-green-50 to-green-100",
    //   darkColor: "from-green-900/30 to-green-900/20",
    //   border: "border-green-200",
    //   darkBorder: "dark:border-green-800",
    //   textColor: "text-green-800",
    //   darkTextColor: "dark:text-green-200",
    //   bgColor: "bg-green-50",
    //   darkBgColor: "dark:bg-green-900/20"
    // },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <Card
          key={index}
          className={`rounded-xl border ${metric.border} ${metric.darkBorder} bg-gradient-to-br ${metric.color} dark:${metric.darkColor} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden relative`}
        >
          <CardContent className="px-5 py-0">
            <div className="flex flex-col">
              <h3 className={`text-sm font-medium ${metric.textColor} dark:${metric.darkTextColor} mb-2`}>{metric.title}</h3>
              <p className={`text-2xl font-bold ${metric.textColor} dark:${metric.darkTextColor} mt-auto`}>{metric.value}</p>
              {metric.subtitle && (
                <div className="mt-2 flex items-center">
                  <span className={`text-xs ${metric.textColor} dark:${metric.darkTextColor} mr-2`}>{metric.subtitle}:</span>
                  <Badge variant="secondary" className="text-xs">
                    {metric.subValue}
                  </Badge>
                </div>
              )}
            </div>
            {/* Decorative element */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${metric.bgColor} dark:${metric.darkBgColor} opacity-30`}></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}