import React from "react";
import { ControlForm } from "@/components/custom/forms";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiReasoningView } from "./AiReasoningView";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/types/auth";

export const ChangeRatingForm = ({ values, form, showScore = true, aiRecommendation, ...props }: any) => {
    const status = form.watch("status");
    const score = form.watch("score");
    const { user } = useAuth();
    
    // When status is "reject" or "na", update score value
    React.useEffect(() => {
        if (status === "pending") {
            form.setValue("status", "");
        }
        else if (status === "reject") {
            form.setValue("score", "0");
        }
        else if (status === "na") {
            form.setValue("score", "na");
        }
        
    }, [status, form]);

    const hasAiRec = aiRecommendation && aiRecommendation.aiStatus !== 'pending' && aiRecommendation.aiStatus;
    
    // correction for the AI: admin only, AI-scored element, evaluator score differs from the AI score
    const aiValue = hasAiRec ? parseFloat(String(aiRecommendation.aiScore)) : NaN;
    const evaluatorScore = status === "na" || score === "na" ? -1 : parseFloat(String(score));
    const showFeedback = showScore && isAdmin(user) && !!hasAiRec && /^HASIL PENILAIAN AI/.test(aiRecommendation.aiReasoning ?? '')
        && !Number.isNaN(evaluatorScore) && !Number.isNaN(aiValue) && evaluatorScore !== aiValue;

    const handleUseAi = () => {
        if (hasAiRec) {
            form.setValue("status", aiRecommendation.aiStatus);
            if (aiRecommendation.aiScore !== undefined && aiRecommendation.aiScore !== null) {
                const val = parseFloat(String(aiRecommendation.aiScore));
                if (val === -1) {
                    form.setValue("status", "na");
                    form.setValue("score", "na");
                } else {
                    form.setValue("score", String(val));
                }
            }
            if (aiRecommendation.aiReasoning) {
                form.setValue("note", aiRecommendation.aiReasoning);
            }
        }
    };
    
    return (
        <div className="flex flex-col gap-4 w-full mt-4">
            {hasAiRec && (
                <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-semibold text-sm">
                            <Sparkles className="h-4 w-4" />
                            Rekomendasi AI
                        </div>
                        <Button 
                            type="button" 
                            size="sm" 
                            variant="outline" 
                            onClick={handleUseAi}
                            className="h-8 text-xs font-semibold border-purple-200 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-400"
                        >
                            Gunakan Rekomendasi
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <span className="text-muted-foreground block font-medium">Status</span>
                            <span className="font-semibold text-foreground uppercase">{aiRecommendation.aiStatus}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block font-medium">Score</span>
                            <span className="font-semibold text-foreground">{parseFloat(String(aiRecommendation.aiScore)) === -1 ? 'N/A' : (parseFloat(String(aiRecommendation.aiScore)) % 1 === 0 ? Math.floor(parseFloat(String(aiRecommendation.aiScore))) : aiRecommendation.aiScore)}</span>
                        </div>
                    </div>
                    {aiRecommendation.aiReasoning && (
                        <div className="text-xs border-t border-purple-100 dark:border-purple-900/20 pt-2">
                            <span className="text-muted-foreground block font-medium mb-1">Reasoning</span>
                            <AiReasoningView text={aiRecommendation.aiReasoning} compact />
                        </div>
                    )}
                </div>
            )}
            <ControlForm form={form} item={values?.status} />
            {showScore && <ControlForm form={form} item={values?.score} disabled={status === "reject" || status === "na"}/>}
            <ControlForm form={form} item={values?.note} />
            {showFeedback && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-3" data-testid="ai-feedback-field">
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mb-1">
                        Skor Anda ({evaluatorScore === -1 ? 'N/A' : evaluatorScore}) berbeda dari skor AI ({aiValue}). Alasan singkat akan
                        dipakai AI sebagai contoh koreksi pada penilaian berikutnya untuk elemen ini.
                    </p>
                    <ControlForm form={form} item={values?.ai_feedback} />
                </div>
            )}
            <ControlForm form={form} item={values?.send_notif} />
        </div>
    );
};