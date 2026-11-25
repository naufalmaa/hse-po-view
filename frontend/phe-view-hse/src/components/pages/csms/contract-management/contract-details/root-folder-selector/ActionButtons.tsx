import React from 'react';
import { ContractFolder } from '@/service/csms/folder-detail';
import { useAppTranslation } from "@/lib/i18n-typed";
import { Button } from '@/components/ui/button';
import { Check, Download, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isFinalFolder, showExportButton, showFinalizeButton } from './utils';
import { DefinalizeButton } from './DefinalizeButton';
import { useAuth } from '@/hooks/use-auth';
import { isAdmin } from '@/types/auth';

interface ActionButtonsProps {
  selectedRootFolder: ContractFolder | null;
  onCompleteFolder?: (folder: ContractFolder) => void;
  onExportEvaluation: () => void;
  onExportCatatanPerbaikan: () => void;
  onExportEchsms: () => void;
  isExportEvaluationPending: boolean;
  isExportCatatanPerbaikanPending: boolean;
  isExportEchsmsPending: boolean;
  refreshFolders?: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  selectedRootFolder,
  onCompleteFolder,
  onExportEvaluation,
  onExportCatatanPerbaikan,
  onExportEchsms,
  isExportEvaluationPending,
  isExportCatatanPerbaikanPending,
  isExportEchsmsPending,
  refreshFolders
}) => {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const canDefinalize = isAdmin(auth?.user) && isFinalFolder(selectedRootFolder);

  // Handler for the Finalize button
  const handleFinalizeClick = () => {
    if (selectedRootFolder && onCompleteFolder) {
      onCompleteFolder(selectedRootFolder);
    }
  };

  const isAnyExportPending =
    isExportEvaluationPending ||
    isExportCatatanPerbaikanPending ||
    isExportEchsmsPending;

  return (
    <div className="grid grid-cols-2 gap-2 pt-0">
      {showFinalizeButton(selectedRootFolder) ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1 inline-block">
              <Button
                onClick={handleFinalizeClick}
                disabled={!selectedRootFolder || !selectedRootFolder.isCompleteAssessment}
                className="w-full"
              >
                <Check className="mr-2 h-4 w-4" />
                {t($ => $.contractManagement.rootFolderSelector.finalize)}
              </Button>
            </span>
          </TooltipTrigger>
          {!selectedRootFolder?.isCompleteAssessment && (
            <TooltipContent>
              <p>Tombol finalisasi aktif setelah seluruh elemen dinilai</p>
            </TooltipContent>
          )}
        </Tooltip>
      ) : canDefinalize && selectedRootFolder ? (
        <DefinalizeButton folder={selectedRootFolder} onDone={refreshFolders} />
      ) : <div></div>}

      {showExportButton(selectedRootFolder) ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex-1"
              disabled={isAnyExportPending}
            >
              {isAnyExportPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t($ => $.contractManagement.rootFolderSelector.exporting)}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t($ => $.contractManagement.rootFolderSelector.exportPdf)}
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onExportEvaluation}
              disabled={isExportEvaluationPending}
            >
              {isExportEvaluationPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t($ => $.contractManagement.rootFolderSelector.exportEvaluation)}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onExportCatatanPerbaikan}
              disabled={isExportCatatanPerbaikanPending}
            >
              {isExportCatatanPerbaikanPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t($ => $.contractManagement.rootFolderSelector.exportCatatanPerbaikan)}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onExportEchsms}
              disabled={isExportEchsmsPending}
            >
              {isExportEchsmsPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t($ => $.contractManagement.rootFolderSelector.exportEchsms)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : <div></div>}
    </div>
  );
};