import { NotFoundError } from '@/components/custom/errors';
import { useAuth } from '@/hooks/use-auth';
import { isAdminOrUser } from '@/types/auth';
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/_vessels')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth();
  
  if (!isAdminOrUser(auth?.user)) {
    return <NotFoundError />
  }

  return (<Outlet />)
}
