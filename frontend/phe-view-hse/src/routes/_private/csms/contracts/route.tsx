import { NotFoundError } from '@/components/custom/errors';
import { useAuth } from '@/hooks/use-auth';
import { AuthProps, isApproval } from '@/types/auth';
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/csms/contracts')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth();

  if (!isApproval(auth?.user)) {
    return <NotFoundError />
  }

  return (<Outlet />)
}
