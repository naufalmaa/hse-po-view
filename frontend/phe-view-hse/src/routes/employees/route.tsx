import { useState } from 'react'
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useLogoutMutation } from '@/service/auth-api';
import { AttendanceHeader } from '@/components/pages/employees/dashboard';
import { APP_CONFIG } from "@/constants/config";
import { useAuth } from "@/hooks/use-auth";
import { isEmployee } from '@/types/auth';
import { NotFoundError } from '@/components/custom/errors';
import { useAppTranslation } from '@/lib/i18n-typed';
import { DialogModal, type ModalProps } from "@/components/custom/components";

export const Route = createFileRoute('/employees')({
  loader: ({ context }) => {
    if (!context?.auth?.isAuthenticated) {
      throw redirect({ to: APP_CONFIG.path.employeeLogin })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logOffMutation = useLogoutMutation();
  const [confirmationModal, setConfirmationModal] = useState<ModalProps | null>(null);

  if (!isEmployee(user)) {
    return (<NotFoundError />)
  }

  const handleLogout = () => {
    setConfirmationModal({
      title: t($ => $.dialog.logOutTitle),
      desc: t($ => $.dialog.logOutDesc),
      textConfirm: t($ => $.shared.logout),
      textCancel: t($ => $.shared.cancel),
      onConfirmClick: () => {
        logOffMutation.mutate(undefined, {
          onSuccess: () => {
            navigate({ to: APP_CONFIG.path.employeeLogin })
            setConfirmationModal(null);
          },
          onError: () => {
            setConfirmationModal(null);
          }
        });
      },
      onCancelClick: () => setConfirmationModal(null),
    })
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans text-slate-800 p-6 flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col gap-4">
        <AttendanceHeader user={user} onLogout={handleLogout} />
        <Outlet />
      </div>
      {confirmationModal && <DialogModal modal={confirmationModal} />}
    </div>
  )
}
