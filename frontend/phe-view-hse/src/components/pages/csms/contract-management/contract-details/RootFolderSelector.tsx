import React, { useState } from 'react';
import { ContractFolder } from '@/service/csms/folder-detail';
import { ListUsersResponse } from '@/service/user-api';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { isAdminOrUser } from '@/types/auth';
import { useExportEvaluation, useExportCatatanPerbaikan, useExportEchsms } from '@/service/csms/contract-management-api';
import { FolderNavigation } from './root-folder-selector';
import { StatsEvaluation } from './StatsEvaluation';
import { StatsFolder } from './StatsFolder';
import { USER_ROLE } from '@/constants/app-enum';

interface RootFolderSelectorProps {
  folders: ContractFolder[];
  selectedRootFolder: ContractFolder | null;
  onSelectRootFolder: (folder: ContractFolder) => void;
  onCopyFolder?: (sourceFolder: ContractFolder, targetFolder: ContractFolder) => void;
  onCompleteFolder?: (folder: ContractFolder) => void;
  refreshFolders?: () => void;
  usersData: ListUsersResponse | undefined;
  isLoadingUsers: boolean;
  aiEvaluationProgress?: Record<string, { status: string; progressMessage?: string }>;
  onStatusChange?: (folderId: string, status: string, progressMessage?: string) => void;
}

export const RootFolderSelector: React.FC<RootFolderSelectorProps> = ({
  folders,
  selectedRootFolder,
  onSelectRootFolder,
  onCopyFolder,
  onCompleteFolder,
  refreshFolders,
  usersData,
  isLoadingUsers,
  aiEvaluationProgress,
  onStatusChange
}) => {
  const auth = useAuth();
  const canManageAuditors = isAdminOrUser(auth?.user);

  // Filter users to only include those with role "user"
  const filteredUsersData = usersData ? {
    ...usersData,
    data: usersData.data?.filter((user: any) => user.role === USER_ROLE.user.value) || []
  } : undefined;

  const filteredApprovalsData = usersData ? {
    ...usersData,
    data: usersData.data?.filter((user: any) => user.role !== USER_ROLE.user.value) || []
  } : undefined;

  // Add the export hooks
  const exportEvaluation = useExportEvaluation();
  const exportCatatanPerbaikan = useExportCatatanPerbaikan();
  const exportEchsms = useExportEchsms();

  // Handler for the Export Evaluation PDF
  const handleExportEvaluation = () => {
    if (selectedRootFolder) {
      exportEvaluation.mutate({
        contractId: selectedRootFolder.contractId,
        folderId: selectedRootFolder.id
      }, {
        onSuccess: (response) => {
          // Create a blob URL and trigger download
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `evaluation-${selectedRootFolder.name}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }
      });
    }
  };

  // Handler for the Export Catatan Perbaikan PDF
  const handleExportCatatanPerbaikan = () => {
    if (selectedRootFolder) {
      exportCatatanPerbaikan.mutate({
        contractId: selectedRootFolder.contractId,
        folderId: selectedRootFolder.id
      }, {
        onSuccess: (response) => {
          // Create a blob URL and trigger download
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `catatan-perbaikan-${selectedRootFolder.name}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }
      });
    }
  };

  // Handler for the Export E-CHSMS Excel
  const handleExportEchsms = () => {
    if (selectedRootFolder) {
      exportEchsms.mutate({
        contractId: selectedRootFolder.contractId,
        folderId: selectedRootFolder.id
      }, {
        onSuccess: (response) => {
          // Create a blob URL and trigger download
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `ECHSEMS-${selectedRootFolder.name}.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }
      });
    }
  };

  const isFolderDokumenEvaluasi = (folderName: string): boolean => {
    return folderName === 'DOKUMEN EVALUASI';
  };

  return (
    <div className="space-y-6">
      {/* Root folder selector section */}
      <Card className="border shadow-none" data-tour="root-folders">
        <CardContent className="px-5">
          {/* Sidebar navigation style folder selector with 1/2 and 1/2 layout */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Folder navigation sidebar - 1/2 width */}
            <FolderNavigation
              folders={folders}
              selectedRootFolder={selectedRootFolder}
              onSelectRootFolder={onSelectRootFolder}
              onCopyFolder={onCopyFolder}
              aiEvaluationProgress={aiEvaluationProgress}
            />

            {/* Selected folder info and actions - 1/2 width */}
            <div className="md:w-1/2" data-tour="stats-folder">
              {isFolderDokumenEvaluasi(selectedRootFolder?.name || '') ?
                // update document evaluation view
                <StatsEvaluation selectedRootFolder={selectedRootFolder} /> :
                selectedRootFolder && (
                  <StatsFolder
                    selectedRootFolder={selectedRootFolder}
                    filteredApprovalsData={filteredApprovalsData}
                    isLoadingUsers={isLoadingUsers}
                    refreshFolders={refreshFolders}
                    filteredUsersData={filteredUsersData}
                    canManageAuditors={canManageAuditors}
                    onCompleteFolder={onCompleteFolder}
                    handleExportEvaluation={handleExportEvaluation}
                    handleExportCatatanPerbaikan={handleExportCatatanPerbaikan}
                    handleExportEchsms={handleExportEchsms}
                    isExportEvaluationPending={exportEvaluation.isPending}
                    isExportCatatanPerbaikanPending={exportCatatanPerbaikan.isPending}
                    isExportEchsmsPending={exportEchsms.isPending}
                    onStatusChange={onStatusChange}
                  />
                )
              }
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};