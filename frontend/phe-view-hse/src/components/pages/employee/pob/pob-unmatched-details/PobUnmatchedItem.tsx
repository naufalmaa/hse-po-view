import { UnmatchedLogEntry, UnmatchedLogSuggestion } from "@/service/employee/pob/pob-unmatched-logs";
import { Trans } from "react-i18next";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, Loader2, User, MoreVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface PobUnmatchedItemProps {
    entry: UnmatchedLogEntry;
    index: number;
    logId: string;
    onCreateCompany?: (companyName: string) => void;
    onCreateEmployee?: (employeeName: string, companyName?: string, ePassport?: string) => void;
    onResolve: (suggestion: UnmatchedLogSuggestion) => void;
    resolvingSuggestionId?: string | null;
}

export function PobUnmatchedItem({ entry, index, logId, onCreateCompany, onCreateEmployee, onResolve, resolvingSuggestionId }: PobUnmatchedItemProps) {
    const { t } = useAppTranslation();
    const [suggestionToResolve, setSuggestionToResolve] = useState<UnmatchedLogSuggestion | null>(null);

    const confirmResolve = () => {
        if (suggestionToResolve) {
            onResolve(suggestionToResolve);
            setSuggestionToResolve(null);
        }
    };

    return (
        <Card className="overflow-hidden border-l-4 border-l-destructive/50 shadow-sm hover:shadow-md transition-all duration-200 p-0">
            <CardContent className="p-0">
                <div className="p-3 sm:p-4 space-y-3">
                    {/* Excel Data Section */}
                    <div className="space-y-2">

                        <div className="bg-muted/5 ">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t($ => $.pobUnmatchedDetails.name)}</p>
                                    <p className="font-medium text-sm truncate" title={entry.excelData.NAME || "-"}>{entry.excelData.NAME || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t($ => $.pobUnmatchedDetails.ePassport)}</p>
                                    <p className="font-medium text-sm font-mono bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 w-fit px-1.5 rounded border border-red-200 dark:border-red-900/50 truncate" title={entry.excelData["E-PASPORT"] || "-"}>
                                        {entry.excelData["E-PASPORT"] || "-"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t($ => $.pobUnmatchedDetails.company)}</p>
                                    <p className="font-medium text-sm flex items-center gap-1.5 truncate" title={entry.excelData.COMPANY || "-"}>
                                        <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate">{entry.excelData.COMPANY || "-"}</span>
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t($ => $.pobUnmatchedDetails.department)}</p>
                                    <p className="font-medium text-sm truncate" title={entry.excelData.DEPARTMENT || "-"}>{entry.excelData.DEPARTMENT || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-2" />
                    <div className="flex flex-row justify-between items-center">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t($ => $.pobUnmatchedDetails.suggestedMatches)}</span>
                        </div>
                        <div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-8 gap-2">
                                        <MoreVertical className="h-4 w-4" />
                                        <span>{t($ => $.pobUnmatchedDetails.actions.title)}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onCreateEmployee?.(entry.excelData.NAME || "", entry.excelData.COMPANY || "", entry.excelData["E-PASPORT"] || "")}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>{t($ => $.pobUnmatchedDetails.actions.createEmployee)}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCreateCompany?.(entry.excelData.COMPANY || "")}>
                                        <Building2 className="mr-2 h-4 w-4" />
                                        <span>{t($ => $.pobUnmatchedDetails.actions.createCompany)}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    {entry.suggestions.length > 0 && (
                        <>
                            <div className="space-y-2">
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {entry.suggestions.map((suggestion) => (
                                        <div
                                            key={suggestion.id}
                                            className={`group relative flex flex-col p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md ${resolvingSuggestionId === suggestion.id
                                                ? 'opacity-70 pointer-events-none'
                                                : ''
                                                }`}
                                            onClick={() => setSuggestionToResolve(suggestion)}
                                        >
                                            <div className="space-y-1 flex-grow">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors truncate" title={suggestion.employeeName}>
                                                        {suggestion.employeeName}
                                                    </p>
                                                    <Badge
                                                        variant={suggestion.similarity > 0.8 ? "default" : "secondary"}
                                                        className="text-[10px] font-bold px-1.5 h-5 ml-2"
                                                    >
                                                        {(suggestion.similarity * 100).toFixed(1)}%
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate" title={suggestion.companyName}>
                                                    <Building2 className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{suggestion.companyName}</span>
                                                </p>
                                            </div>

                                            {/* Show loading indicator when resolving this specific suggestion */}
                                            {resolvingSuggestionId === suggestion.id && (
                                                <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-lg">
                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>

            <AlertDialog open={!!suggestionToResolve} onOpenChange={(open) => !open && setSuggestionToResolve(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t($ => $.pobUnmatchedDetails.confirmResolve.title)}</AlertDialogTitle>
                        <AlertDialogDescription>
                            <Trans
                                i18nKey="pobUnmatchedDetails.confirmResolve.description"
                                values={{ suggestionName: suggestionToResolve?.employeeName }}
                                components={{
                                    highlighter: <span className="font-bold text-primary" />
                                }}
                            />
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t($ => $.pobUnmatchedDetails.confirmResolve.cancel)}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmResolve}>{t($ => $.pobUnmatchedDetails.confirmResolve.confirm)}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card >
    )
}