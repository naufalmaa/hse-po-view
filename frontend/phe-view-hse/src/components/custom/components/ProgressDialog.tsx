import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n-typed";

type ProgressDialogProps = {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  progress?: number;
  status: "processing" | "success" | "error";
  onClose?: () => void;
  onConfirm?: () => void;
};

export const ProgressDialog = ({
  open,
  title,
  message,
  progress,
  status,
  onClose,
  onConfirm,
}: ProgressDialogProps) => {
  const { t } = useAppTranslation();

  const getStatusIcon = () => {
    switch (status) {
      case "processing":
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "processing":
        return t($ => $.dialog.processing);
      case "success":
        return t($ => $.dialog.success);
      case "error":
        return t($ => $.dialog.error);
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && onClose) {
        onClose();
      }
    }}>
      <DialogContent className="" showCloseButton={status !== "processing"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            {title}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line" asChild>
            <div>
              {typeof message === 'string' ? message : message}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {status === "processing" && (
            <div className="space-y-2">
              {progress !== undefined && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}
              <p className="text-sm text-center text-muted-foreground">
                {progress !== undefined ? `${Math.round(progress)}%` : getStatusText()}
              </p>
            </div>
          )}

          {status !== "processing" && (
            <div className="flex justify-end">
              <Button
                onClick={onConfirm || onClose}
                variant={status === "success" ? "default" : "destructive"}
              >
                {status === "success" ? t($ => $.shared.ok) : t($ => $.shared.retry)}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};