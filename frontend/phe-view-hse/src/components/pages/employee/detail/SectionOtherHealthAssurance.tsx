import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CiEdit } from "react-icons/ci";
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import { z } from "zod";
import FormOtherHealthAssurance from "./FormOtherHealthAssurance";
import { LuHeart } from "react-icons/lu";
import { AppTranslation } from "@/lib/i18n-typed";

type Props = {
    info: Record<string, any>;
    onUpdateClicked: (id: string, body: any) => void;
    t: AppTranslation;
    disableEditing: boolean;
}

export const SectionOtherHealthAssurance = ({ info, onUpdateClicked, t, disableEditing }: Props) => {
    const [confirmationPut, setConfirmationPut] = React.useState<ModalFormProps | null>(null);
    const otherHealthAssurance = info?.employee?.otherHealthAssurance;

    const onEditClicked = () => {
        setConfirmationPut({
            title: t($ => $.employee.detail.otherHealthAssurance),
            desc: t($ => $.employee.detail.updateOtherHealthAssurance),
            defaultValue: {
                otherHealthAssurance: otherHealthAssurance ?? "",
            },
            child: {
                otherHealthAssurance: {
                    type: 'textarea',
                    name: 'otherHealthAssurance',
                    label: "",
                    placeholder: t($ => $.employee.detail.otherHealthAssurancePlaceholder),
                    minRows: 5,
                    maxRows: 7,
                },
            },
            schema: {
                otherHealthAssurance: z.string().optional(),
            },
            content: <FormOtherHealthAssurance />,
            onCancelClick: () => setConfirmationPut(null),
            onConfirmClick: (body: Record<string, string>) => {
                const newBody = {
                    key: "general",
                    data: {
                        otherHealthAssurance: body?.otherHealthAssurance,
                    }
                }
                onUpdateClicked(info?.employee?.id, newBody);
                setConfirmationPut(null);
            },
        });
    };

    return (
        <Card className="shadow-lg border-border">
            <CardContent className="px-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <LuHeart className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">{t($ => $.employee.detail.otherHealthAssurance)}</h3>
                    </div>
                    {!disableEditing && (
                        <Button
                            size="icon"
                            variant="outline"
                            className="w-7 h-7 rounded-full"
                            onClick={onEditClicked}
                        >
                            <CiEdit className="text-primary w-4 h-4" />
                        </Button>
                    )}
                </div>
                <div className="text-sm prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                    {otherHealthAssurance ? otherHealthAssurance : "-"}
                </div>
            </CardContent>
            {confirmationPut && <DialogModalForm modal={confirmationPut} />}
        </Card>
    );
};
