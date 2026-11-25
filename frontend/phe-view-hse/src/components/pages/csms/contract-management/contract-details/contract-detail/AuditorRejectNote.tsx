import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ApprovalAction } from '@/service/csms/contracts';
import { useAppTranslation } from "@/lib/i18n-typed";

interface AuditorRejectNoteProps {
    actions?: ApprovalAction[];
    role?: string;
}

export const AuditorRejectNote: React.FC<AuditorRejectNoteProps> = ({ actions, role }) => {
    const { t } = useAppTranslation();

    // Get the last action
    const lastAction = actions?.slice(-1)[0];

    // If no action or no note, don't render
    if (!lastAction?.note) return null;

    return (
        <Alert variant="destructive" className="mt-4 bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="ml-2 font-semibold flex justify-between items-center w-full">
                <span>
                    {t($ => $.contractManagement.rejectText)} {role && `(${role.charAt(0).toUpperCase() + role.slice(1)})`}
                </span>
            </AlertTitle>
            <AlertDescription className="ml-2 mt-1">
                <div className="font-medium">{lastAction.userName}</div>
                {lastAction.approvedAt && (
                    <div className="text-xs text-red-700 opacity-90 mb-2 dark:text-red-300">
                        {format(new Date(lastAction.approvedAt), "dd MMMM yyyy HH:mm", { locale: id })}
                    </div>
                )}
                <p className="whitespace-pre-wrap text-sm text-red-800 dark:text-red-200">
                    <span className="font-medium">{t($ => $.contractManagement.form.notes.label)}:</span> {lastAction.note}</p>
            </AlertDescription>
        </Alert>
    );
};
