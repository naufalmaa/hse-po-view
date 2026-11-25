import { toast } from "sonner";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckIcon, X } from "lucide-react";

export const showNotifSuccess = ({ message, description }: { message: React.ReactNode, description?: React.ReactNode }) => {
  return (
    toast.custom((t) => (
      <Alert className='rounded-md border-l-6 border-green-600 bg-green-100 text-green-600 dark:border-green-400 dark:bg-green-100 dark:text-green-400'
        onClick={() => toast.dismiss(t)}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center gap-2">
            <CheckIcon className="h-5 w-5 shrink-0" />
            <AlertTitle className="font-semibold">{message}</AlertTitle>
          </div>
          {description && <AlertDescription>{description}</AlertDescription>}
        </div>
      </Alert>
    ))
  )
}

export const showNotifError = ({ message, description }: { message: React.ReactNode, description?: React.ReactNode }) => {
  return (
    toast.custom((t) => (
      <Alert className='rounded-md border-l-6 border-red-600 bg-red-100 text-red-600 dark:border-red-400 dark:bg-red-100 dark:text-red-400'
        onClick={() => toast.dismiss(t)}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center gap-2">
            <X className="h-5 w-5 shrink-0" />
            <AlertTitle className="font-semibold">{message}</AlertTitle>
          </div>
          {description && <AlertDescription>{description}</AlertDescription>}
        </div>
      </Alert>
    ))
  )
}