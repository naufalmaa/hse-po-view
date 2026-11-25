import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormDatePicker, ControlForm } from "@/components/custom/forms";
import { Form } from "@/components/ui/form";
import { useAppTranslation } from "@/lib/i18n-typed";
import { AttendanceListParams } from "@/service/employee/attendance-list";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { string_to_date } from "@/lib/my-utils";
import { defaultStore } from "@/stores/useAppStore";

type Props = {
    form: any;
    onSubmit: (data: AttendanceListParams) => void;
    setOpenFilter?: (open: boolean) => void;
    loading?: boolean;
    vesselList?: any[];
    projectIdList?: any[];
    contractorList?: any[];
    locationList?: any[];
}

const ContainerFilter = ({ form, onSubmit, setOpenFilter, loading, vesselList = [], projectIdList = [], contractorList = [], locationList = [] }: Props) => {
    const { t } = useAppTranslation();

    const [formList, setFormList] = useState<Record<string, any>>({
        category: {
            type: "multiselect",
            name: "category",
            label: t($ => $.attendanceList.attendanceList.category.label),
            placeholder: t($ => $.attendanceList.attendanceList.category.placeholder),
            options: [
                { value: EMPLOYEE_TYPE.project.value, label: t($ => $.attendanceList.attendanceList.category.project) },
                { value: EMPLOYEE_TYPE.marine.value, label: t($ => $.attendanceList.attendanceList.category.marine) },
                { value: EMPLOYEE_TYPE.mitra.value, label: t($ => $.attendanceList.attendanceList.category.mitra) },
            ]
        },
        projectId: {
            type: "multiselect",
            name: "projectId",
            label: t($ => $.employeeList.filterProject),
            options: projectIdList || [],
            maxCount: 1,
        },
        subContractorId: {
            type: "multiselect",
            name: "subContractorId",
            label: t($ => $.employeeList.filterSubContractor),
            options: contractorList || [],
            maxCount: 1,
        },
        vesselId: {
            type: "multiselect",
            name: "vesselId",
            label: t($ => $.employeeList.filterVessel),
            options: vesselList || [],
            maxCount: 1,
        },
        location: {
            type: "multiselect",
            name: "location",
            label: "Lokasi Pekerja",
            placeholder: "Pilih Lokasi Pekerja",
            options: locationList || [],
        },
        status: {
            type: "multiselect",
            name: "status",
            label: t($ => $.attendanceList.attendanceList.status.label),
            placeholder: t($ => $.attendanceList.attendanceList.status.placeholder),
            options: [
                { value: "on_duty", label: t($ => $.attendanceList.attendanceList.status.onDuty) },
                { value: "off_duty", label: t($ => $.attendanceList.attendanceList.status.offDuty) },
            ]
        },
        selectByRange: {
            type: "select",
            name: "selectByRange",
            label: t($ => $.attendanceList.attendanceList.selectByRange.label),
            placeholder: t($ => $.attendanceList.attendanceList.selectByRange.placeholder),
            options: [
                { value: "true", label: t($ => $.attendanceList.attendanceList.selectByRange.true) },
                { value: "false", label: t($ => $.attendanceList.attendanceList.selectByRange.false) },
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
            label: t($ => $.attendanceList.attendanceList.dateEnd.label),
        },
        orderBy: {
            type: "select",
            name: "orderBy",
            label: t($ => $.attendanceList.attendanceList.orderBy.label),
            options: [
                { value: "asc", label: t($ => $.attendanceList.attendanceList.orderBy.asc) },
                { value: "desc", label: t($ => $.attendanceList.attendanceList.orderBy.desc) },
            ]
        }
    });

    React.useEffect(() => {
        setFormList(prev => ({
            ...prev,
            vesselId: { ...prev.vesselId, options: vesselList },
            projectId: { ...prev.projectId, options: projectIdList },
            subContractorId: { ...prev.subContractorId, options: contractorList },
            location: { ...prev.location, options: locationList },
        }));
    }, [vesselList.length, projectIdList.length, contractorList.length, locationList.length]);

    const selectByRangeValue = form.watch("selectByRange");

    const onSubmitClicked = (values: any) => {
        const isRangeSelected = values.selectByRange === "true" || values.selectByRange === true;

        const processedValues: any = {
            ...values,
            selectByRange: isRangeSelected,
            date_start: isRangeSelected ? values.date_start : undefined,
            date_end: isRangeSelected ? values.date_end : undefined,
            status: values.status ? (Array.isArray(values.status) ? values.status : [values.status]) : undefined,
        };

        // Remove empty array filters to avoid backend issues
        if (processedValues.projectId?.length === 0) delete processedValues.projectId;
        if (processedValues.vesselId?.length === 0) delete processedValues.vesselId;
        if (processedValues.subContractorId?.length === 0) delete processedValues.subContractorId;
        if (processedValues.location?.length === 0) delete processedValues.location;

        onSubmit(processedValues);
        setOpenFilter?.(false);
    }

    const onResetClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const resetData = {
            ...defaultStore.attendanceList,
            date_start: string_to_date(defaultStore.attendanceList.date_start),
            date_end: string_to_date(defaultStore.attendanceList.date_end)
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

                    <div className={""}>
                        <ControlForm form={form} item={formList.category} />
                    </div>

                    <div className={""}>
                        <ControlForm form={form} item={formList.projectId} />
                    </div>

                    <div className={""}>
                        <ControlForm form={form} item={formList.subContractorId} />
                    </div>

                    <div className={""}>
                        <ControlForm form={form} item={formList.vesselId} />
                    </div>

                    <div className={""}>
                        <ControlForm form={form} item={formList.location} />
                    </div>

                    <div className={""}>
                        <ControlForm form={form} item={formList.status} />
                    </div>

                    <div className={""}>
                        <ControlForm form={form} item={formList.orderBy} />
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
export default ContainerFilter
