import { ContractFolder } from '@/service/csms/folder-detail';
import React from 'react';

// Score configuration with colors based on value ranges (same as FolderTree.tsx)
export const getScoreConfig = (score: number | string | undefined | null) => {
  if (score === undefined || score === null) {
    return {
      color: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600",
      label: "N/A"
    };
  }

  const scoreNum = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(scoreNum) || scoreNum === -1) {
    return {
      color: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600",
      label: "N/A"
    };
  }

  const rounded = Math.round(scoreNum * 10) / 10;
  const label = rounded.toFixed(2);

  if (rounded === 0) {
    return {
      color: "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700",
      label
    };
  }

  if (scoreNum <= 3) {
    return {
      color: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700",
      label
    };
  }

  if (scoreNum <= 6) {
    return {
      color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700",
      label
    };
  }

  // Score 7 or higher
  return {
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700",
    label
  };
};

// Status configuration with icons and colors (matching FolderTree.tsx)
export const STATUS_CONFIG = {
  pending: {
    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700",
    label: "Pending"
  },
  accept: {
    color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700",
    label: "Accept"
  },
  reject: {
    color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700",
    label: "Reject"
  },
  revision: {
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700",
    label: "Revisi"
  }
};

// Function to render status with color (matching FolderTree.tsx)
export const renderStatusBadge = (status: string) => {
  if (!status) {
    return <span>N/A</span>;
  }

  const statusKey = status.toLowerCase() as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[statusKey];

  if (!config) {
    return <span>{status}</span>;
  }

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${config.color}`}>
      {config.label}
    </span>
  );
};

// Helper function to get a more descriptive title from folder name
export const getFolderTitle = (folderName: string): string => {
  // check if it's PSB
  if (folderName.endsWith(' - PSB')) {
    return ('PENILAIAN SEBELUM BERJALAN')
  }
  // Check if it's an assessment folder (PB or PA)
  else if (folderName.endsWith(' - PB') || folderName.endsWith(' - PA')) {
    // Extract date from folder name (first 10 characters: DD-MM-YYYY)
    const folderDateStr = folderName.substring(0, 10);
    const [day, month, year] = folderDateStr.split('-');

    // Convert to date object
    const folderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Get semester information
    const folderYear = folderDate.getFullYear();
    const folderMonth = folderDate.getMonth();

    // Check if it's a final assessment (PA)
    if (folderName.endsWith(' - PA')) {
      return `PENILAIAN AKHIR ${folderYear}`;
    }

    // Determine semester
    // Semester I: January - June
    // Semester II: July - December
    if (folderMonth < 6) {
      return `PENILAIAN BERJALAN SEMESTER I ${folderYear}`;
    } else {
      return `PENILAIAN BERJALAN SEMESTER II ${folderYear}`;
    }
  }

  // For non-assessment folders, return the original name
  return folderName;
};

// Helper function to check if it's an assessment folder
export const isAssessmentFolder = (folderName: string): boolean => {
  return folderName.endsWith(' - PB') || folderName.endsWith(' - PA');
};

// Helper function to extract and format folder date (dd/mm/yyyy)
export const getFolderDateDisplay = (folderName: string, assessmentDate?: string): string | null => {
  const match = folderName.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${day}/${month}/${year}`;
  }
  if (assessmentDate) {
    const d = new Date(assessmentDate);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  return null;
};

// Helper function to check if it's a PB folder
export const isPBFolder = (folderName: string): boolean => {
  return folderName.endsWith(' - PB');
};

// Helper function to check if it's a PA folder
export const isPAFolder = (folderName: string): boolean => {
  return folderName.endsWith(' - PA');
};

// Helper functions for button visibility
export const showFinalizeButton = (selectedRootFolder: ContractFolder | null) => {
  return selectedRootFolder !== null && (selectedRootFolder?.isFinal ?? false) === false;
};

export const showExportButton = (selectedRootFolder: ContractFolder | null) => {
  if ((selectedRootFolder?.name.endsWith(' - PSB'))) {
    return (false);
  }

  return ((selectedRootFolder?.isCompleteAssessment === true))
};

export const isFinalFolder = (selectedRootFolder: ContractFolder | null) => {
  return ((selectedRootFolder?.isFinal === true))
};
