import * as React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { APP_CONFIG } from '@/constants/config'
import { Attendance, AttendanceListResponse, useAttendanceList } from '@/service/employees/attendance-list'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Camera, LogOut } from 'lucide-react'
import { AttendanceStatusCard, AttendanceTime } from "@/components/pages/employees/dashboard";
import { useAppTranslation } from '@/lib/i18n-typed';
import { AppRoute } from '@/constants/app-route'

export const Route = createFileRoute('/employees/dashboard')({
  component: EmployeeDashboardPage,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: APP_CONFIG.path.employeeLogin })
    }
  },
})

function EmployeeDashboardPage() {
  const { t } = useAppTranslation();
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = React.useState(new Date())

  // APIs
  const attendanceListMutation = useAttendanceList()

  // State for data
  const [todayAttendance, setTodayAttendance] = React.useState<Attendance | null>(null)

  // Update time every second
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Initial Data Load
  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    attendanceListMutation.mutate({
      body: {
        limit: 1
      }
    }, {
      onSuccess: (res: AttendanceListResponse) => {
        if (res.success && res.data) {
          if (res.data.length > 0) {
            setTodayAttendance(res.data[0])
          }
        }
      }
    })
  }

  // UI Helpers
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--'
    try {
      return format(new Date(dateStr), 'HH:mm', { locale: id })
    } catch {
      return '--:--'
    }
  }

  const getStatusInfo = () => {
    if (!todayAttendance) {
      return {
        statusClass: 'bg-slate-100 text-slate-500',
        statusText: t($ => $.employeesAttendance.status.notYet),
        currentText: t($ => $.employeesAttendance.status.notYetDesc),
        checkInTime: '--:--',
        checkInClass: 'text-slate-900',
        checkOutTime: '--:--',
        checkOutClass: 'text-slate-900',
        showCheckIn: true,
        showCheckOut: false
      }
    }

    if (todayAttendance.statusAfter === 'on_duty') {
      return {
        statusClass: 'bg-green-100 text-green-600',
        statusText: t($ => $.employeesAttendance.status.onDuty),
        currentText: t($ => $.employeesAttendance.status.onDutyDesc),
        checkInTime: formatTime(todayAttendance.createdAt),
        checkInClass: 'text-green-600',
        checkOutTime: '--:--',
        checkOutClass: 'text-slate-900',
        showCheckIn: false,
        showCheckOut: true
      }
    }

    if (todayAttendance.statusAfter === 'off_duty') {
      return {
        statusClass: 'bg-red-100 text-red-600',
        statusText: t($ => $.employeesAttendance.status.offDuty),
        currentText: t($ => $.employeesAttendance.status.offDutyDesc),
        checkInTime: 'Done',
        checkInClass: 'text-green-600',
        checkOutTime: formatTime(todayAttendance.createdAt),
        checkOutClass: 'text-red-600',
        showCheckIn: true,
        showCheckOut: false
      }
    }

    return {
      statusClass: 'bg-slate-100 text-slate-500',
      statusText: t($ => $.employeesAttendance.status.unknown),
      currentText: '--',
      checkInTime: '--:--',
      checkInClass: '',
      checkOutTime: '--:--',
      checkOutClass: '',
      showCheckIn: false,
      showCheckOut: false
    }
  }

  const { statusClass, statusText, currentText, showCheckIn, showCheckOut } = getStatusInfo()

  return (
    <>

      {/* Time Display */}
      <AttendanceTime currentTime={currentTime} />

      {/* Attendance Status Card */}
      <AttendanceStatusCard
        statusClass={statusClass}
        statusText={statusText}
        currentText={currentText}
        data={todayAttendance}
      />

      {/* Action Buttons */}
      <div className="flex gap-3">
        {showCheckIn && (
          <button
            onClick={() => navigate({ to: AppRoute.employeeUser.attendance.url })}
            className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Camera className="w-5 h-5" />
            {t($ => $.employeesAttendance.checkInButton)}
          </button>
        )}

        {showCheckOut && (
          <button
            onClick={() => navigate({ to: AppRoute.employeeUser.attendance.url })}
            className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            {t($ => $.employeesAttendance.checkOutButton)}
          </button>
        )}
      </div>

    </>
  )
}

export default EmployeeDashboardPage
