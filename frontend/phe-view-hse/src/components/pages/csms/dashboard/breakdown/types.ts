export interface CompletionRateItemExtended {
    contractId: string;
    contractTitle: string;
    contractNumber: string;
    contractfolderName: string; // PB or PA
    dateAssessment: string;
    isComplete: boolean;
    fillingProgress: number;
    isFinal: boolean;
    vendorName?: string | null;
    vesselName?: string | null;
    score?: number | null;
    passStatus?: string | null;
}

export interface SemesterCompletionRateExtended {
    completionRate: number;
    items: CompletionRateItemExtended[];
}

export interface YearCompletionRateBreakdownExtended {
    year: number;
    semester1: SemesterCompletionRateExtended;
    semester2: SemesterCompletionRateExtended;
}
