import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { APP_CONFIG } from '@/constants/config'
import { AttendanceListResponse, useAttendanceList, Attendance } from '@/service/employees/attendance-list'
import { useEffect, useState } from 'react'
import { useAppTranslation } from '@/lib/i18n-typed'
import { Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { AttendanceHistoryCard } from '@/components/pages/employees/attendance-history/AttendanceHistoryCard'
import { AppRoute } from '@/constants/app-route'
import { groupAttendanceToCycles } from '@/components/pages/employee/attendance/AttendanceHistory'

export const Route = createFileRoute('/employees/attendance-history')({
  component: EmployeeAttendanceHistoryPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      page: Number(search?.page ?? 0),
    }
  },
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: APP_CONFIG.path.employeeLogin })
    }
  },
})

function EmployeeAttendanceHistoryPage() {
  const { t } = useAppTranslation()
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()
  const attendanceListMutation = useAttendanceList()
  const [historyData, setHistoryData] = useState<Attendance[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const LIMIT = 5

  useEffect(() => {
    attendanceListMutation.mutate({
      body: {
        limit: LIMIT,
        page: page
      }
    }, {
      onSuccess: (res: AttendanceListResponse) => {
        if (res.success && res.data) {
          setHistoryData(res.data)
          if (res.meta) {
            setTotalPages(res.meta.totalPages)
          }
        }
      }
    })
  }, [page]) // Refetch when page changes

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev: any) => ({ ...prev, page: newPage }),
    })
  }

  const cycles = groupAttendanceToCycles(historyData as any)

  if (attendanceListMutation.isPending && page === 0 && historyData.length === 0) {
    // Only show full loader on initial load
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p>{t($ => $.employeesAttendance.historyLoading)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-3 mb-4">
        <Link
          to={AppRoute.employeeUser.dashboard.url}
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-lg font-bold text-slate-800">{t($ => $.employeesAttendance.historyTitle)}</h2>
      </div>

      {attendanceListMutation.isPending && historyData.length > 0 && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      )}

      {cycles.length === 0 && !attendanceListMutation.isPending ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-100 shadow-sm">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{t($ => $.employeesAttendance.historyEmpty)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => (
            <AttendanceHistoryCard key={cycle.id} cycle={cycle} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8 pt-4 border-t border-slate-100">
          <button
            onClick={() => handlePageChange(Math.max(0, page - 1))}
            disabled={page === 0 || attendanceListMutation.isPending}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm font-medium text-slate-600">
            Page {page + 1} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1 || attendanceListMutation.isPending}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
