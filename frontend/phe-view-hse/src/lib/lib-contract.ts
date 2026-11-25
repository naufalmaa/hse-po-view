import { OngoinAssesmentDate } from "@/service/csms/folder-detail";

export const getNearestOngoingAssessmentDate = (assessmentDates: (OngoinAssesmentDate | string)[] | undefined) => {
    if (!assessmentDates || !Array.isArray(assessmentDates)) return [];

    // Filter out folders with names ending in "- PSB" and "- PA"
    return assessmentDates
        .filter(item => {
            if (!item) return false;

            // If item is a string date (from contract details), keep it
            if (typeof item === 'string') return Boolean(item.trim());

            // If no folderInfo, keep the item
            if (!item.folderInfo || item.folderInfo.length === 0) return true;

            // Check if any folderInfo has name ending with "- PSB" or "- PA"
            const hasPSBorPA = item.folderInfo.some(folder =>
                folder.folderName?.endsWith('- PSB') ||
                folder.folderName?.endsWith('- PA')
            );

            // Return true if no folders end with "- PSB" or "- PA"
            return !hasPSBorPA;
        })
        .map(item => {
            const dateVal = typeof item === 'string' ? item : item?.date;
            return { date: dateVal };
        });
};

export interface AssessmentDateItem {
    id?: string;
    date: string;
    folderId?: string;
    folderName?: string;
    type: 'PSB' | 'PB' | 'PA';
    label: string;
    canDelete: boolean;
    /** Root folder score, when the item comes from the folder list */
    score?: number;
}

export const getAssessmentPeriodLabel = (type: 'PSB' | 'PB' | 'PA', dateStr: string): string => {
    if (type === 'PSB') return 'PSB';
    if (type === 'PA') return 'PA';

    let year: number;
    let month: number;

    const ddmmyyyyMatch = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (ddmmyyyyMatch) {
        month = parseInt(ddmmyyyyMatch[2], 10) - 1;
        year = parseInt(ddmmyyyyMatch[3], 10);
    } else {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'PB';
        month = d.getMonth();
        year = d.getFullYear();
    }

    const semester = month < 6 ? 'I' : 'II';
    return `PB Smt. ${semester} ${year}`;
};

export const getAllAssessmentDates = (contractOrFolders: any): AssessmentDateItem[] => {
    if (!contractOrFolders) return [];

    // If it's an array of folders (from ContractFolder[]):
    if (Array.isArray(contractOrFolders)) {
        const rootAssessmentFolders = contractOrFolders.filter((f: any) =>
            (f.depth === 0 || !f.parentId) &&
            (f.name?.endsWith(' - PSB') || f.name?.endsWith(' - PB') || f.name?.endsWith(' - PA'))
        );

        return rootAssessmentFolders.map((f: any): AssessmentDateItem => {
            let type: 'PSB' | 'PB' | 'PA' = 'PB';
            if (f.name.endsWith(' - PSB')) type = 'PSB';
            else if (f.name.endsWith(' - PA')) type = 'PA';

            const match = f.name.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
            let dateIso = '';
            if (match) {
                dateIso = `${match[3]}-${match[2]}-${match[1]}`;
            } else if (f.assessmentDate) {
                dateIso = new Date(f.assessmentDate).toISOString().split('T')[0];
            }

            return {
                date: dateIso || f.name,
                folderId: f.id,
                folderName: f.name,
                type,
                label: getAssessmentPeriodLabel(type, dateIso || f.name),
                canDelete: type === 'PB',
                score: f.score !== null && f.score !== undefined && !isNaN(Number(f.score)) ? Number(f.score) : undefined,
            };
        }).sort((a: AssessmentDateItem, b: AssessmentDateItem) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
    }

    // If it's a contract object (from contract-management / contract list):
    const items: AssessmentDateItem[] = [];
    const contract = contractOrFolders;

    if (Array.isArray(contract.nearestOngoingAssessmentDate)) {
        contract.nearestOngoingAssessmentDate.forEach((entry: any) => {
            if (typeof entry === 'string') {
                items.push({
                    date: entry,
                    type: 'PB',
                    label: getAssessmentPeriodLabel('PB', entry),
                    canDelete: true,
                });
            } else if (entry?.folderInfo && entry.folderInfo.length > 0) {
                entry.folderInfo.forEach((folder: any) => {
                    let type: 'PSB' | 'PB' | 'PA' = 'PB';
                    if (folder.folderName?.endsWith(' - PSB')) type = 'PSB';
                    else if (folder.folderName?.endsWith(' - PA')) type = 'PA';

                    const d = entry.date || folder.folderDate;
                    items.push({
                        date: d,
                        folderId: folder.folderId,
                        folderName: folder.folderName,
                        type,
                        label: getAssessmentPeriodLabel(type, d),
                        canDelete: type === 'PB',
                    });
                });
            } else if (entry?.date) {
                items.push({
                    date: entry.date,
                    type: 'PB',
                    label: getAssessmentPeriodLabel('PB', entry.date),
                    canDelete: true,
                });
            }
        });
    }

    const hasPSB = items.some(i => i.type === 'PSB');
    if (!hasPSB && contract.startDate) {
        items.unshift({
            date: contract.startDate,
            type: 'PSB',
            label: 'PSB',
            canDelete: false,
        });
    }

    const hasPA = items.some(i => i.type === 'PA');
    if (!hasPA && contract.finalAssessmentDate) {
        items.push({
            date: contract.finalAssessmentDate,
            type: 'PA',
            label: 'PA',
            canDelete: false,
        });
    }

    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};