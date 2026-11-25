import React from "react";
import { Button } from "@/components/ui/button";
import { defaultStore } from "@/stores/useAppStore";
import { Form } from "@/components/ui/form";
import { AppTranslation, useAppTranslation } from "@/lib/i18n-typed";
import { ControlForm } from "@/components/custom/forms";
import { OrderbyOptions } from "@/constants/app-enum";

interface FilterProps {
    form: any;
    onSubmit: (values: any) => void;
    loading?: boolean;
    contractorOptions?: Array<{ label: string, value: string }>; // Add contractor options prop
};

export const sortByOptions = (t: AppTranslation) => [
    { value: "title", label: t($ => $.contractManagement.contractTitle) },
    { value: "contractorName", label: t($ => $.contractManagement.contractor) },
    { value: "startDate", label: t($ => $.contractManagement.startDate) },
    { value: "endDate", label: t($ => $.contractManagement.endDate) },
    { value: "createdAt", label: t($ => $.contractManagement.createdAt) },
    { value: "updatedAt", label: t($ => $.contractManagement.updatedAt) },
];

export function FilterContract({ form, onSubmit, loading, contractorOptions = [] }: FilterProps) { // Add contractorOptions to props
    const { t } = useAppTranslation();

    const formList = {
        subContractorId: { // Changed from contractorIds to subContractorIds to match store
            name: "subContractorId",
            label: t($ => $.contractManagement.contractor),
            type: "multiselect",
            placeholder: t($ => $.contractManagement.form.contractor.placeholder),
            options: contractorOptions,
            maxCount: 1
        },
        sort: {
            name: "sort",
            label: t($ => $.contractManagement.sortBy),
            type: "select",
            options: sortByOptions(t)
        },
        order: {
            name: "order",
            label: t($ => $.contractManagement.filters.sortOrder),
            type: "select",
            options: OrderbyOptions
        }
    };

    const onSubmitClicked = () => {
        onSubmit(form.getValues());
    };

    const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const resetData = {
            ...defaultStore.contractManagement
        };
        form.reset(resetData);
        onSubmit(form.getValues());
    };

    return (
        <div className="space-y-4 p-4">
            <div className="space-y-1">
                <h3 className="text-lg font-semibold leading-none">{t($ => $.contractManagement.filters.filter)}</h3>
                <p className="text-muted-foreground text-sm">
                    {t($ => $.contractManagement.pageSubtitle)}
                </p>
            </div>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmitClicked)}
                    className="space-y-4"
                >
                    <div className="grid gap-4">
                        <div>
                            <ControlForm form={form} item={formList?.subContractorId} /> {/* Updated reference */}
                        </div>
                        <div>
                            <ControlForm form={form} item={formList?.sort} />
                        </div>
                        <div>
                            <ControlForm form={form} item={formList?.order} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={onResetClicked}
                            disabled={loading}
                            type="button"
                        >
                            {t($ => $.shared.reset)}
                        </Button>
                        <Button disabled={loading} className="shadow-sm">
                            {loading && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>}
                            {t($ => $.shared.apply_filters)}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}