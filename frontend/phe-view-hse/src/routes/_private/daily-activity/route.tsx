import { NotFoundError } from '@/components/custom/errors';
import { useAuth } from '@/hooks/use-auth';
import { isCrewString } from '@/types/auth';
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/daily-activity')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth();
  const userRole = auth?.user?.user?.role ?? "";

  if (isCrewString(userRole)) {
    return <NotFoundError />
  }

  return (<Outlet />)
}
