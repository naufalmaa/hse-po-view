import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, ChevronsUpDown, ChevronsDownUp, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppTranslation } from "@/lib/i18n-typed";

interface FolderActionsProps {
    showExportToZip: () => boolean;
    handleExportFolderAsZip: () => void;
    isExportingZip: boolean;
    expandedFoldersSize: number;
    collapseAllFolders: () => void;
    expandAllFolders: () => void;
    selectedRootFolderId: string | null;
}

export const FolderActions: React.FC<FolderActionsProps> = ({
    showExportToZip,
    handleExportFolderAsZip,
    isExportingZip,
    expandedFoldersSize,
    collapseAllFolders,
    expandAllFolders,
    selectedRootFolderId
}) => {
    const { t } = useAppTranslation();

    return (
        <div className="flex justify-end pt-2 gap-2">
            {showExportToZip() && <Button
                variant="outline"
                size="sm"
                onClick={handleExportFolderAsZip}
                disabled={!selectedRootFolderId || isExportingZip}
                className="flex items-center gap-2"
            >
                {isExportingZip ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t($ => $.contractManagement.rootFolderSelector.exporting)}
                    </>
                ) : (
                    <>
                        <Download className="h-4 w-4" />
                        {t($ => $.contractManagement.rootFolderSelector.exportZip)}
                    </>
                )}
            </Button>}

            <Button
                variant="outline"
                size="sm"
                onClick={expandedFoldersSize > 0 ? collapseAllFolders : expandAllFolders}
                disabled={!selectedRootFolderId}
                className="flex items-center gap-2"
            >
                {expandedFoldersSize > 0 ? (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        {t($ => $.contractManagement.rootFolderSelector.collapseAll)}
                    </>
                ) : (
                    <>
                        <ChevronDown className="h-4 w-4" />
                        {t($ => $.contractManagement.rootFolderSelector.expandAll)}
                    </>
                )}
            </Button>
        </div>
    );
};