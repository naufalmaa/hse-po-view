import React, { useState } from 'react';
import { ContractFolder } from '@/service/csms/folder-detail';
import { useAppTranslation } from "@/lib/i18n-typed";
import { getScoreConfig } from './utils';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface ScoreDisplayProps {
  selectedRootFolder: ContractFolder | null;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ selectedRootFolder }) => {
  const { t } = useAppTranslation();
  // Default to collapsed as requested
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Extract the 8 main elements under A. RENCANA K3LL (Must be before any early return)
  const elements = React.useMemo(() => {
    if (!selectedRootFolder?.children) return [];
    const rencanaK3LL = selectedRootFolder.children.find(c => c.name === 'A. RENCANA K3LL');
    const sourceFolders = rencanaK3LL?.children || selectedRootFolder.children;
    return sourceFolders
      .filter(f => f.fileType === 'folder' && /^[1-8]\s/.test(f.name))
      .sort((a, b) => {
        const numA = parseInt(a.name.match(/^([1-8])/)?.[1] || '0', 10);
        const numB = parseInt(b.name.match(/^([1-8])/)?.[1] || '0', 10);
        return numA - numB;
      });
  }, [selectedRootFolder]);

  // Compute raw score (skor murni akumulasi elemen sebelum skala 100)
  const rawScore = React.useMemo(() => {
    let sum = 0;
    let hasValid = false;
    elements.forEach(el => {
      const s = el.score !== undefined && el.score !== null ? parseFloat(String(el.score)) : -1;
      if (s !== -1 && !isNaN(s)) {
        // Round each category score to 1 decimal place (e.g. 6.17 -> 6.2)
        const roundedCat = Math.round(s * 10) / 10;
        sum += roundedCat;
        hasValid = true;
      }
    });
    if (!hasValid) return null;
    const roundedSum = Math.round(sum * 10) / 10;
    return roundedSum.toFixed(2);
  }, [elements]);

  if (!selectedRootFolder?.isCompleteAssessment || selectedRootFolder.score === undefined) {
    return null;
  }

  const rootScoreNum = parseFloat(String(selectedRootFolder.score));
  const rootScoreFormatted = !isNaN(rootScoreNum)
    ? (Math.round(rootScoreNum * 10) / 10).toFixed(2)
    : String(selectedRootFolder.score);

  return (
    <div>
      {selectedRootFolder.score !== undefined && (
        <div className="mt-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${selectedRootFolder.score >= 60
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}>
                {selectedRootFolder.score >= 60
                  ? t($ => $.contractManagement.rootFolderSelector.passed)
                  : t($ => $.contractManagement.rootFolderSelector.failed)}
              </div>
            </div>

            <span className={`text-3xl font-bold px-4 py-2 rounded-lg border ${getScoreConfig(rootScoreFormatted).color}`}>
              {getScoreConfig(rootScoreFormatted).label}
            </span>
          </div>

          {/* Recap Summary of 8 Elements */}
          {elements.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Ringkasan Nilai Kategori K3LL ({elements.length})</span>
                </div>
                {isSummaryOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {isSummaryOpen && (
                <div className="space-y-2 mt-2 pt-1">
                  {/* Skor Murni akumulasi sebelum perkalian rumus nilai akhir */}
                  {rawScore !== null && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">Total Skor Murni:</span>
                        <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">(sebelum rumus konversi perkalian nilai akhir)</span>
                      </div>
                      <span className="font-bold text-sm px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100">
                        {rawScore}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {elements.map((el) => {
                    const scoreCfg = getScoreConfig(el.score);
                    return (
                      <div
                        key={el.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40 text-xs"
                      >
                        <span className="truncate mr-2 font-medium text-foreground/90" title={el.name}>
                          {el.name}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* AI category score next to the evaluator score */}
                          {el.aiScore !== undefined && el.aiScore !== null && parseFloat(String(el.aiScore)) > 0 && (
                            <span
                              title="Skor AI kategori"
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            >
                              AI {(Math.round(parseFloat(String(el.aiScore)) * 10) / 10).toString()}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${scoreCfg.color}`}>
                            {scoreCfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};