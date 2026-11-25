import React, { useState } from 'react';
import { useAppTranslation } from "@/lib/i18n-typed";
import { ContractFolder } from '@/service/csms/folder-detail';
import { ApprovalHistory, ApprovalAction } from '@/service/csms/contracts';
import { Check, Mail, RotateCcw } from 'lucide-react';
import {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperNav,
  StepperTrigger
} from '@/components/ui/stepper';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { DialogModalForm } from '@/components/custom/components';
import { z } from 'zod';
import { useSendEmailEvaluation } from '@/service/csms/contract-management-api';
import FormResendEmail from './FormResendEmail';
import { showNotifSuccess, showNotifError } from '@/lib/show-notif';
import { USER_ROLE } from '@/constants/app-enum';

interface ApprovalProgressProps {
  selectedRootFolder: ContractFolder | null;
  usersData?: any;
  isLoadingUsers?: boolean;
  refreshFolders?: () => void;
}

export const ApprovalProgress: React.FC<ApprovalProgressProps> = ({ selectedRootFolder, usersData, isLoadingUsers, refreshFolders }) => {
  const { t } = useAppTranslation();
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [emailPopoverOpen, setEmailPopoverOpen] = useState(false);
  const [confirmationResend, setConfirmationResend] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState({
    evaluator: '',
    verificator: '',
    manager: ''
  });

  const sendEmailMutation = useSendEmailEvaluation();

  if (!selectedRootFolder?.approvalStatus) {
    return null;
  }

  const { approvalStatus } = selectedRootFolder;
  const { currentApprovalLevel, isFullyApproved, approvalHistory } = approvalStatus;

  // Get email sending summaries if available
  const emailSummaries = selectedRootFolder.emailSendingSummary || [];

  // Define the approval steps with keys matching ApprovalHistory
  const approvalSteps = [
    {
      id: 'evaluator',
      label: t($ => $.contractManagement.rootFolderSelector.approvalSteps.evaluator),
      description: t($ => $.contractManagement.rootFolderSelector.approvalSteps.evaluatorDesc)
    },
    {
      id: 'verifikator',
      label: t($ => $.contractManagement.rootFolderSelector.approvalSteps.verificator),
      description: t($ => $.contractManagement.rootFolderSelector.approvalSteps.verificatorDesc)
    },
    {
      id: 'manager',
      label: t($ => $.contractManagement.rootFolderSelector.approvalSteps.manager),
      description: t($ => $.contractManagement.rootFolderSelector.approvalSteps.managerDesc)
    }
  ];

  // Filter users by role (similar to RootFolderSelector)
  const evaluatorUsers = usersData?.data?.filter((user: any) => user.role === USER_ROLE.evaluator.value) || [];
  const verificatorUsers = usersData?.data?.filter((user: any) => user.role === USER_ROLE.verifikator.value) || [];
  const managerUsers = usersData?.data?.filter((user: any) => user.role === USER_ROLE.manager.value) || [];

  // Determine the current step index
  const getCurrentStepIndex = () => {
    if (isFullyApproved) return approvalSteps.length; // All steps completed

    switch (currentApprovalLevel) {
      case 'evaluator':
        return 1;
      case 'verifikator':
        return 2;
      case 'manager':
        return 3;
      default:
        return 0; // Not started
    }
  };

  const currentStepIndex = getCurrentStepIndex();

  const handlePopoverOpen = (index: number) => {
    setOpenPopoverIndex(index);
  };

  const handlePopoverClose = () => {
    setOpenPopoverIndex(null);
  };

  // Get approval history for a specific step
  const getStepHistory = (stepId: string): ApprovalAction[] => {
    if (!approvalHistory) return [];
    // Access the history array by key (stepId needs to be cast or checked)
    const history = approvalHistory[stepId as keyof ApprovalHistory];
    return history || [];
  };

  // Check if a step has approved status
  const isStepApproved = (stepId: string): boolean => {
    if (!approvalHistory) return false;
    const history = approvalHistory[stepId as keyof ApprovalHistory];
    if (!history || history.length === 0) return false;
    const lastItem = history[history.length - 1];
    return lastItem.status.toLowerCase() === 'accept';
  };

  // Check if a step has rejected status
  const isStepRejected = (stepId: string): boolean => {
    if (!approvalHistory) return false;
    const history = approvalHistory[stepId as keyof ApprovalHistory];
    if (!history || history.length === 0) return false;
    const lastItem = history[history.length - 1];
    return lastItem.status.toLowerCase() === 'rejected';
  };

  // Get status badge variant based on status value
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'accept':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'reopened':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Handle resend email
  const handleResendEmail = (data: { evaluator?: string; verificator?: string; manager?: string }) => {
    if (!selectedRootFolder) return;

    // Collect selected user IDs and get unique values
    const recipientUserIds = [...new Set(Object.values(data).filter(id => id !== undefined && id !== '') as string[])];

    if (recipientUserIds.length === 0) return;

    sendEmailMutation.mutate({
      contractId: selectedRootFolder.contractId,
      folderId: selectedRootFolder.id,
      recipientUserIds
    }, {
      onSuccess: () => {
        showNotifSuccess({ message: t($ => $.contractManagement.rootFolderSelector.emailSentSuccess, { defaultValue: 'Email berhasil dikirim!' }) });
        setEmailPopoverOpen(false);
        setSelectedUsers({
          evaluator: '',
          verificator: '',
          manager: ''
        });
        // Refresh folders after successful email sending
        if (refreshFolders) {
          refreshFolders();
        }
      },
      onError: (error: unknown) => {
        console.error("Failed to send email:", error);
        showNotifError({ message: t($ => $.contractManagement.rootFolderSelector.emailSendFailed, { defaultValue: 'Gagal mengirim email. Silakan coba lagi.' }) });
      }
    });

    setConfirmationResend(null);
  };

  const formEmailSending = {
    form: {
      info: {
        title: t($ => $.contractManagement.rootFolderSelector.resendEmail),
        description: t($ => $.contractManagement.rootFolderSelector.resendEmailDescription)
      },
      evaluator: {
        type: 'combobox',
        name: 'evaluator',
        label: t($ => $.contractManagement.rootFolderSelector.approvalSteps.evaluator),
        placeholder: t($ => $.contractManagement.rootFolderSelector.searchEvaluator),
        options: evaluatorUsers.map((user: any) => ({
          label: `${user.name} (${user.email})`,
          value: user.id
        }))
      },
      verificator: {
        type: 'combobox',
        name: 'verificator',
        label: t($ => $.contractManagement.rootFolderSelector.approvalSteps.verificator),
        placeholder: t($ => $.contractManagement.rootFolderSelector.searchVerificator),
        options: verificatorUsers.map((user: any) => ({
          label: `${user.name} (${user.email})`,
          value: user.id
        }))
      },
      manager: {
        type: 'combobox',
        name: 'manager',
        label: t($ => $.contractManagement.rootFolderSelector.approvalSteps.manager),
        placeholder: t($ => $.contractManagement.rootFolderSelector.searchManager),
        options: managerUsers.map((user: any) => ({
          label: `${user.name} (${user.email})`,
          value: user.id
        }))
      }
    },
    schema: {
      evaluator: z.string().optional(),
      verificator: z.string().optional(),
      manager: z.string().optional()
    },
    defaultValues: {
      evaluator: '',
      verificator: '',
      manager: ''
    }
  }
  // Set up the resend email dialog
  const onResendEmail = () => {
    setConfirmationResend({
      title: t($ => $.contractManagement.rootFolderSelector.resendEmail),
      desc: t($ => $.contractManagement.rootFolderSelector.resendEmailDescription),
      defaultValue: formEmailSending.defaultValues,
      child: formEmailSending.form,
      schema: formEmailSending.schema,
      content: (
        <FormResendEmail values={formEmailSending.form} />
      ),
      textConfirm: t($ => $.contractManagement.rootFolderSelector.sending),
      onCancelClick: () => setConfirmationResend(null),
      onConfirmClick: (body: Record<string, string>) => {
        // Prevent multiple submissions if mutation is already in progress
        if (!sendEmailMutation.isPending) {
          handleResendEmail(body);
        }
      },
    });
  };

  return (
    <div className="flex flex-col mt-4 gap-2" data-tour="approval-progress">
      <div className='flex flex-row justify-between items-center'>
        <h3 className="text-sm font-medium text-muted-foreground">
          {t($ => $.contractManagement.rootFolderSelector.approvalProgress)}
        </h3>

        {(selectedRootFolder?.isCompleteAssessment === true) && (
          emailSummaries.length > 0 ? (
            <Popover open={emailPopoverOpen} onOpenChange={setEmailPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  size={"sm"}
                  disabled={sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <RotateCcw className="size-4 mr-2 animate-spin" />
                      {t($ => $.contractManagement.rootFolderSelector.sendingEmail)}
                    </>
                  ) : (
                    <>
                      <Mail className="size-4 mr-2" /> {t($ => $.contractManagement.rootFolderSelector.emailHistory)}
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 ">
                <div className="space-y-3">
                  <h4 className="font-medium">{t($ => $.contractManagement.rootFolderSelector.emailHistory)}</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {emailSummaries.map((summary, index) => (
                      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">
                              {t($ => $.contractManagement.rootFolderSelector.sentAt)}: {summary.sentAt}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {t($ => $.contractManagement.rootFolderSelector.totalSent)}: {summary.totalSent} | {t($ => $.contractManagement.rootFolderSelector.emailFailed)}: {summary.totalFailed}
                            </p>
                          </div>
                        </div>
                        {summary.recipients.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1">{t($ => $.contractManagement.rootFolderSelector.recipients)}:</p>
                            <div className="flex flex-wrap gap-1">
                              {summary.recipients.map((recipient, recipientIndex) => (
                                <span
                                  key={recipientIndex}
                                  className={`text-xs px-2 py-1 rounded ${recipient.status.toLowerCase() === 'sent'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    }`}
                                >
                                  {recipient.email}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Add Resend Email button */}
                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      disabled={sendEmailMutation.isPending}
                      onClick={() => {
                        // Close the popover and open the dialog
                        setEmailPopoverOpen(false);
                        onResendEmail();
                      }}
                    >
                      {sendEmailMutation.isPending ? (
                        <>
                          <RotateCcw className="size-4 mr-2 animate-spin" />
                          {t($ => $.contractManagement.rootFolderSelector.sendingEmail, { defaultValue: 'Sending email...' })}
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-4 mr-2" />
                          {t($ => $.contractManagement.rootFolderSelector.resendEmail)}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              variant={'outline'}
              size={'sm'}
              onClick={onResendEmail}
            >
              <Mail className="size-4 mr-2" /> {t($ => $.contractManagement.rootFolderSelector.sendEmail)}
            </Button>
          )
        )}
      </div>

      <div className="bg-card rounded-lg p-4 border">
        <Stepper
          defaultValue={currentStepIndex}
          indicators={{
            completed: <Check className="size-4" />,
          }}
          className="w-full"
        >
          <StepperNav>
            {approvalSteps.map((step, index) => (
              <StepperItem
                key={step.id}
                step={index + 1}
                completed={index + 1 < currentStepIndex || isFullyApproved}
                className="relative flex-1 items-start"
              >
                <Popover open={openPopoverIndex === index} onOpenChange={(isOpen) => isOpen ? handlePopoverOpen(index) : handlePopoverClose()}>
                  <PopoverTrigger asChild>
                    <StepperTrigger className="flex flex-col gap-1 cursor-pointer">
                      <StepperIndicator
                        className={isStepApproved(step.id)
                          ? 'bg-green-500 text-white dark:bg-green-600 data-[state=completed]:bg-green-500'
                          : isStepRejected(step.id)
                            ? 'bg-red-500 text-white dark:bg-red-600 data-[state=active]:bg-red-500'
                            : ''
                        }
                      >
                        {isStepApproved(step.id)
                          ? <Check className="size-4" />
                          : isStepRejected(step.id)
                            ? <span className="text-xs">X</span>
                            : index + 1}
                      </StepperIndicator>
                      <StepperTitle>{step.label}</StepperTitle>
                      {/* <StepperDescription>{step.description}</StepperDescription> */}
                    </StepperTrigger>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 max-h-[400px] overflow-y-auto">
                    <div className="space-y-2">
                      <h4 className="font-medium">{step.label} {t($ => $.contractManagement.rootFolderSelector.approvalHistory)}</h4>
                      {getStepHistory(step.id).length > 0 ? (
                        getStepHistory(step.id).map((historyItem, historyIndex) => (
                          <div key={historyIndex} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                            <p className="text-sm font-medium">{historyItem.userName}</p>
                            <p className="text-xs">
                              {t($ => $.contractManagement.rootFolderSelector.date)}: {new Date(historyItem.approvedAt).toLocaleString()}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${getStatusVariant(historyItem.status)}`}>
                              {historyItem.status === 'reopened' ? 'Dibuka ulang oleh admin' : historyItem.status}
                            </span>
                            <p className="text-xs mt-1 text-muted-foreground">{historyItem?.note || ''}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t($ => $.contractManagement.rootFolderSelector.noApprovalHistory)}
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {index < approvalSteps.length - 1 && (
                  <StepperSeparator className=" absolute top-3 inset-x-0 left-[calc(50%+0.875rem)] m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem+0.225rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none group-data-[state=completed]/step:bg-primary" />
                )}
              </StepperItem>
            ))}
          </StepperNav>
        </Stepper>
      </div>

      {/* Resend Email Dialog Modal */}
      {confirmationResend && (
        <DialogModalForm
          modal={confirmationResend}
          onDismissOutside={false}
        />
      )}
    </div>
  );
};