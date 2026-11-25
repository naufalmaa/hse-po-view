import { createFileRoute } from '@tanstack/react-router'
import { AiCsmsAdmin } from '@/components/pages/admin/csms-ai/AiCsmsAdmin'

// admin only (parent route /_private/admin checks the role)
export const Route = createFileRoute('/_private/admin/__csms-ai/csms-ai')({
  component: AiCsmsAdmin,
})
