import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePobUpdate, PobData } from "@/service/employee/pob/pob-update";
import { Loader2, Upload, FileSpreadsheet } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useRef, useEffect } from "react";

interface PobUploadSectionProps {
    file: File | null;
    setFile: (file: File | null) => void;
    setPreviewData: (data: PobData | null) => void;
    isPending?: boolean;
    onAnalyzeSuccess?: (data: PobData) => void;
    onResetSettings?: () => void;
    onReset?: () => void;
}

export function PobUploadSection({
    file,
    setFile,
    setPreviewData,
    isPending: externalIsPending,
    onAnalyzeSuccess,
    onResetSettings,
    onReset
}: PobUploadSectionProps) {
    const { t } = useAppTranslation();
    const { mutateAsync: updatePobAsync, isPending: mutationIsPending } = usePobUpdate();

    const isPending = externalIsPending || mutationIsPending;

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!file && inputRef.current) {
            inputRef.current.value = "";
        }
    }, [file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewData(null);
            if (onResetSettings) {
                onResetSettings();
            }
        }
    };

    const handleAnalyze = () => {
        if (!file) return;

        updatePobAsync({ file, updates: false }).then((data) => {
            if (data.success) {
                setPreviewData(data.data);
                showNotifSuccess({ message: data.message });
                if (onAnalyzeSuccess) {
                    onAnalyzeSuccess(data.data);
                }
            }
        }).catch((error) => {
            showNotifError({ message: error.message });
        });
    };

    return (
        <Card className="shadow-lg border-border">
            <CardHeader>
                <CardTitle>{t($ => $.pobUpdate.upload.title)}</CardTitle>
                <CardDescription>{t($ => $.pobUpdate.upload.description)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="picture">{t($ => $.pobUpdate.upload.label)}</Label>
                    <Input
                        ref={inputRef}
                        id="picture"
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        disabled={isPending}
                    />
                </div>

                {file && (
                    <div className="flex items-center gap-2">
                        {/* <FileSpreadsheet className="h-4 w-4 text-green-600" /> */}
                        {/* <span className="text-sm font-medium">{file.name}</span> */}
                        <Button size="sm" onClick={handleAnalyze} disabled={isPending}>
                            {mutationIsPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {t($ => $.pobUpdate.upload.button)}
                        </Button>
                        <Button variant="subtle-destructive" size="sm" onClick={onReset} disabled={isPending}>
                            {t($ => $.pobUpdate.form.cancel)}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
