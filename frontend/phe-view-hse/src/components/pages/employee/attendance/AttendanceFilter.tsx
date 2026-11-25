import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormDatePicker, ControlForm } from "@/components/custom/forms";
import { Form } from "@/components/ui/form";
import { useAppTranslation } from "@/lib/i18n-typed";
import { string_to_date } from "@/lib/my-utils";
import { defaultStore } from "@/stores/useAppStore";

type Props = {
    form: any;
    onSubmit: (data: any) => void;
    setOpenFilter?: (open: boolean) => void;
    loading?: boolean;
}

export const AttendanceFilter = ({ form, onSubmit, setOpenFilter, loading }: Props) => {
    const { t } = useAppTranslation();

    const [formList] = useState<Record<string, any>>({
        selectByRange: {
            type: "select",
            name: "selectByRange",
            label: t($ => $.attendance.filter.dateRange),
            placeholder: t($ => $.attendance.filter.searchPlaceholder),
            options: [
                { value: "true", label: t($ => $.shared.yes) }, // Assuming shared.yes exists or specific translation
                { value: "false", label: t($ => $.shared.no) },
            ]
        },
        date_start: {
            type: "date",
            name: "date_start",
            label: t($ => $.attendanceList.attendanceList.dateStart.label),
        },
        date_end: {
            type: "date",
            name: "date_end",
            label: t($ => $.attendanceList.attendanceList.dateEnd.label)
        },
    });

    const selectByRangeValue = form.watch("selectByRange");

    const onSubmitClicked = (values: any) => {
        const isRangeSelected = values.selectByRange === "true" || values.selectByRange === true;

        const processedValues = {
            ...values,
            selectByRange: isRangeSelected,
            date_start: isRangeSelected ? values.date_start : undefined,
            date_end: isRangeSelected ? values.date_end : undefined,
        };

        onSubmit(processedValues);
        setOpenFilter?.(false);
    }

    const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const resetData = {
            ...defaultStore.attendanceList,
            selectByRange: "false",
            date_start: new Date(),
            date_end: new Date()
        };
        form.reset(resetData);
        onSubmit(form.getValues());
        setOpenFilter?.(false);
    }

    const isDateInputsVisible = selectByRangeValue === "true" || selectByRangeValue === true;

    return (
        <div className={"flex flex-col gap-2 p-4"}>
            <div>
                <h4 className="leading-none font-medium">{t($ => $.shared.filter)}</h4>
                <p className="text-muted-foreground text-sm">
                    {t($ => $.attendanceList.shared.filterDescription)}
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitClicked)}
                    className={"grid grid-cols-1 gap-4"}>

                    <div className="space-y-3">
                        <ControlForm form={form} item={formList.selectByRange} />

                        {isDateInputsVisible && (
                            <div className={"grid grid-cols-2 gap-2"}>
                                <FormDatePicker form={form} item={formList.date_start} />
                                <FormDatePicker form={form} item={formList.date_end} />
                            </div>
                        )}
                    </div>

                    <div className={"grid grid-cols-2 gap-2 mt-2"}>
                        <Button variant={"destructive"} type="button" onClick={onResetClicked} disabled={loading}>{t($ => $.shared.reset)}</Button>
                        <Button type="submit" disabled={loading}>{t($ => $.shared.submit)}</Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}
