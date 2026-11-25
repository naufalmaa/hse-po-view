import { useAppTranslation } from "@/lib/i18n-typed";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";
import { CalendarCheck, History, LayoutDashboard, LogOut, User } from "lucide-react";

interface AttendanceHeaderProps {
    user: any;
    onLogout: () => void;
}

export const AttendanceHeader = ({ user, onLogout }: AttendanceHeaderProps) => {
    const { t } = useAppTranslation();

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            'admin': 'Administrator',
            'user': 'User',
            'employee': 'Pekerja',
            'crew': 'Crew',
            'contractor': 'Kontraktor',
            'evaluator': 'Evaluator',
            'verifikator': 'Verifikator',
            'manager': 'Manager'
        };
        return labels[role] || role || 'Pekerja';
    }

    return (
        <header className="bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] text-white p-6 rounded-2xl shadow-lg shadow-blue-600/20">
            <div className="flex justify-between items-start mb-4">
                <h1 className="text-xl font-bold">{t($ => $.employeesAttendance.title)}</h1>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-white/50">
                            <User className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col">
                                <span className="font-semibold">{user?.user?.name || 'User'}</span>
                                <span className="text-xs text-muted-foreground font-normal">{user?.user?.email || ''}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                            <Link to={AppRoute.employeeUser.dashboard.url} className="cursor-pointer">
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                <span>{t($ => $.employeesAttendance.menu.dashboard)}</span>
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <Link to={AppRoute.employeeUser.attendanceHistory.url} className="cursor-pointer">
                                <History className="w-4 h-4 mr-2" />
                                <span>{t($ => $.employeesAttendance.menu.history)}</span>
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                            <LogOut className="w-4 h-4 mr-2" />
                            <span>{t($ => $.employeesAttendance.logout)}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-semibold text-lg">
                    {user?.user?.name ? user.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '--'}
                </div>
                <div>
                    <h2 className="text-lg font-semibold leading-tight">{user?.user?.name || '--'}</h2>
                    <p className="text-xs opacity-90">{getRoleLabel(user?.user?.role || '')}</p>
                    <div className="inline-block bg-white/20 px-2.5 py-1 rounded-md text-[10px] mt-1">
                        HSSE: {user?.user?.hssePassportNumber || '-'}
                    </div>
                </div>
            </div>
        </header>
    )
}
