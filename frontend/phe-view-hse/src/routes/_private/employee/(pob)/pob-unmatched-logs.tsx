import { createFileRoute, Link } from '@tanstack/react-router'
import { usePobUnmatchedLogs } from '@/service/employee/pob/pob-unmatched-logs'
import { Loader2, ArrowLeft, AlertCircle, FileText, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppTranslation } from '@/lib/i18n-typed'
import { AppRoute } from '@/constants/app-route'
import { PobUnmatchedLogsTable } from '@/components/pages/employee/pob/pob-unmatched-logs'

export const Route = createFileRoute(
  '/_private/employee/(pob)/pob-unmatched-logs',
)({
  component: PobUnmatchedLogsPage,
})

function PobUnmatchedLogsPage() {
  const { t } = useAppTranslation()
  const { data: response, isLoading, isError, error } = usePobUnmatchedLogs()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>{t($ => $.pobUnmatchedLogs.error)}: {(error as Error).message}</p>
      </div>
    )
  }

  const logs = response?.data || []

  return (
    <div className="w-full space-y-6">
      <div>
        {/* <Link to={AppRoute.employee.pobUpdate.url}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t($ => $.pobUnmatchedLogs.back)}
          </Button>
        </Link> */}
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t($ => $.pobUnmatchedLogs.title)}</h1>
            <p className="text-muted-foreground mt-1">{t($ => $.pobUnmatchedLogs.description)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden p-6">
        <PobUnmatchedLogsTable data={logs} loading={isLoading} />
      </div>
    </div>
  )
}
