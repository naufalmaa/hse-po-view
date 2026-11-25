import React from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { AppTranslation, useAppTranslation } from "@/lib/i18n-typed";
import { ControlForm } from "@/components/custom/forms";
import { OrderbyOptions } from "@/constants/app-enum";

interface FilterProps {
    form: any;
    onSubmit: (values: any) => void;
    loading?: boolean;
}

export const filterOptions = (t: AppTranslation) => [
    { value: "all", label: t($ => $.pobUnmatchedDetails.filters.all) },
    { value: "with_suggestion", label: t($ => $.pobUnmatchedDetails.filters.withSuggestion) },
    { value: "without_suggestion", label: t($ => $.pobUnmatchedDetails.filters.withoutSuggestion) },
];

export const sortByOptions = (t: AppTranslation) => [
    { value: "name", label: t($ => $.pobUnmatchedDetails.filters.name) },
    { value: "similarity", label: t($ => $.pobUnmatchedDetails.filters.similarity) },
];

export function FilterPobUnmatched({ form, onSubmit, loading }: FilterProps) {
    const { t } = useAppTranslation();

    const formList = {
        filter: {
            name: "filter",
            label: t($ => $.pobUnmatchedDetails.filters.filter),
            type: "select",
            options: filterOptions(t),
            placeholder: t($ => $.pobUnmatchedDetails.filters.selectFilter)
        },
        sortBy: {
            name: "sortBy",
            label: t($ => $.pobUnmatchedDetails.filters.sortBy),
            type: "select",
            options: sortByOptions(t),
            placeholder: t($ => $.pobUnmatchedDetails.filters.selectSortBy)
        },
        orderBy: {
            name: "orderBy",
            label: t($ => $.pobUnmatchedDetails.filters.sortOrder),
            type: "select",
            options: OrderbyOptions,
            placeholder: t($ => $.pobUnmatchedDetails.filters.selectOrderBy)
        }
    };

    const onSubmitClicked = () => {
        onSubmit(form.getValues());
    };

    const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const resetData = {
            filter: "all",
            sortBy: "similarity",
            orderBy: "desc"
        };
        form.reset(resetData);
        onSubmit(resetData);
    };

    return (
        <div className="space-y-4 p-4">
            <div className="space-y-1">
                <h3 className="text-lg font-semibold leading-none">{t($ => $.pobUnmatchedDetails.filters.title)}</h3>
            </div>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmitClicked)}
                    className="space-y-4"
                >
                    <div className="grid gap-4">
                        <div>
                            <ControlForm form={form} item={formList.filter} />
                        </div>
                        <div>
                            <ControlForm form={form} item={formList.sortBy} />
                        </div>
                        <div>
                            <ControlForm form={form} item={formList.orderBy} />
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
