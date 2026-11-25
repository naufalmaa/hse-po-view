import { createFileRoute, redirect } from '@tanstack/react-router'
import { APP_CONFIG } from "@/constants/config";
import { isAdminOrUser, isApproval, isContractor, isCrew, isEmployee } from '@/types/auth';

export const Route = createFileRoute('/')({
  loader: ({ context }) => {
    let path_ = '';

    if (context.auth.isAuthenticated) {
      const user_ = context.auth.user;
      if (isAdminOrUser(user_)) {
        path_ = APP_CONFIG.path.defaultPrivate;
      } else if (isContractor(user_)) {
        path_ = APP_CONFIG.path.defaultContractor;
      } else if (isCrew(user_)) {
        path_ = APP_CONFIG.path.defaultCrew;
      } else if (isApproval(user_)) {
        path_ = APP_CONFIG.path.defaultAuditor;
      } else if (isEmployee(user_)) {
        path_ = APP_CONFIG.path.defaultEmployee;
      }
    } else {
      path_ = APP_CONFIG.path.defaultPublic;
    }
    return redirect({ to: path_ })
  },
  component: () => null,
})
