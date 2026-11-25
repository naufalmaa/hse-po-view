import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { FolderTree } from '../FolderTree';
import { ContractFolder } from '@/service/csms/folder-detail';
import { useAppTranslation } from "@/lib/i18n-typed";

interface FolderTableProps {
  selectedRootFolder: ContractFolder | null;
  folders: ContractFolder[];
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
  handleCreateSubfolderClick: (folder: ContractFolder) => void;
  handleEditDescriptionClick: (folder: ContractFolder) => void;
  handleDeleteFolderClick: (folder: ContractFolder) => void;
  handleUploadFileClick: (folder: ContractFolder) => void;
  handleChangeRatingClick: (folder: ContractFolder, showScore?: boolean) => void;
  handleViewFile: (file: ContractFolder) => void;
  handleEditFolderClick: (folder: ContractFolder) => void;
  handleDeleteFile: (file: ContractFolder) => void;
  handleEditFile: (file: ContractFolder) => void;
  isFolderPSB: (folderName: string) => boolean;
}

export const FolderTable: React.FC<FolderTableProps> = ({
  selectedRootFolder,
  folders,
  expandedFolders,
  toggleFolder,
  handleCreateSubfolderClick,
  handleEditDescriptionClick,
  handleDeleteFolderClick,
  handleUploadFileClick,
  handleChangeRatingClick,
  handleViewFile,
  handleEditFolderClick,
  handleDeleteFile,
  handleEditFile,
  isFolderPSB
}) => {
  const { t } = useAppTranslation();

  // Determine if the selected folder is a PSB folder
  const isFinal = selectedRootFolder ? isFolderPSB(selectedRootFolder.name) : false;

  return (
    <Card className="border border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">{t($ => $.contractManagement.fileName)}</TableHead>
              <TableHead className="w-1/4">{t($ => $.contractManagement.lastModified)}</TableHead>
              <TableHead className="w-1/6">{t($ => $.contractManagement.status)}</TableHead>
              <TableHead className="w-1/6">{t($ => $.contractManagement.score)}</TableHead>
              <TableHead className="w-1/6">{t($ => $.contractManagement.note)}</TableHead>
              <TableHead className="text-right">{t($ => $.contractManagement.actions)}</TableHead>
            </TableRow>
          </TableHeader>
          {selectedRootFolder ? (
            <TableBody>
              <FolderTree
                folders={selectedRootFolder.children || []}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                onDeleteFolder={handleDeleteFolderClick}
                onCreateSubfolder={handleCreateSubfolderClick}
                onEditFolder={handleEditFolderClick}
                onUploadFile={handleUploadFileClick}
                onDeleteFile={handleDeleteFile}
                onEditFile={handleEditFile}
                onChangeRating={handleChangeRatingClick}
                onViewFile={handleViewFile}
                isFinal={isFinal}
              />
            </TableBody>
          ) : (
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                  {t($ => $.contractManagement.selectFolderMessage)}
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </CardContent>
    </Card>
  );
};