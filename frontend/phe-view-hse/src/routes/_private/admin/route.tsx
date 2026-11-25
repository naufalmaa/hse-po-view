import { NotFoundError } from '@/components/custom/errors';
import { USER_ROLE } from '@/constants/app-enum';
import { useAuth } from '@/hooks/use-auth';
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/admin')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth();
  const userRole = auth?.user?.user?.role ?? "";

  if (userRole !== USER_ROLE.admin.value) {
    return <NotFoundError />
  }

  return (<Outlet />)
}
