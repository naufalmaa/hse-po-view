import { Button } from "@/components/ui/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";
import { usePobUnmatchedLogDetail, PobUnmatchedLogDetailParams, usePobResolveSuggestion, UnmatchedLogSuggestion } from "@/service/employee/pob/pob-unmatched-logs";
import { useContractorGet, useContractorCreate } from "@/service/contractor-api";
import { Loader2, AlertCircle, FileQuestion, History, ArrowLeft } from "lucide-react";
import { PobUnmatchedStats, PobUnmatchedItem, FilterPobUnmatched, filterOptions, sortByOptions } from "@/components/pages/employee/pob/pob-unmatched-details";
import { FormContractor, onContractorCreated } from "@/components/pages/contractors";
import { onCreateEmployee } from "@/components/pages/employee/smart-card/validation/templates/employee-template";
import FormCreateEmployee from "@/components/pages/employee/smart-card/validation/FormCreateEmployee";
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useEmployeeCreate } from '@/service/employee';
import { useState } from "react";
import { DataTablePagination } from "@/components/custom/table/data-table-pagination";
import { useAppTranslation } from '@/lib/i18n-typed';
import { useForm } from "react-hook-form";
import { PopoverFilter } from '@/components/app/PopoverFilter';
import { Badge } from '@/components/ui/badge';
import { OrderbyOptions } from "@/constants/app-enum";
import { defaultStore, useAppStore } from "@/stores/useAppStore";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute(
    '/_private/employee/(pob)/pob-unmatched-details',
)({
    validateSearch: (search: Record<string, unknown>): { id: string } => {
        return {
            id: (search.id as string) || '',
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    const { id } = Route.useSearch()
    const { t } = useAppTranslation();
    const store = useAppStore();
    const queryClient = useQueryClient();
    const resolveMutation = usePobResolveSuggestion();
    const initialFilter = store?.pobUnmatchedDetails ?? defaultStore.pobUnmatchedDetails;
    const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
    const pageCreateMutation = useContractorCreate();
    const employeeCreateMutation = useEmployeeCreate();

    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(initialFilter.limit || 5);

    const form = useForm({
        defaultValues: {
            filter: initialFilter.filter,
            sortBy: initialFilter.sortBy,
            orderBy: initialFilter.orderBy
        }
    });

    const [filterParams, setFilterParams] = useState<PobUnmatchedLogDetailParams>({
        filter: initialFilter.filter as any,
        sortBy: initialFilter.sortBy as any,
        orderBy: initialFilter.orderBy as any
    });

    const onFilterSubmit = (values: any) => {
        setFilterParams(values);
        setPage(0);
        store.setPobUnmatchedDetails({
            ...values,
            page: 0,
            limit
        });
    };

    const onCreateCompany = (companyName: string) => {
        onContractorCreated(
            setConfirmationCreate,
            (body: Record<string, string>) => {
                pageCreateMutation.mutate({ body }, {
                    onSuccess: (data) => {
                        queryClient.invalidateQueries({ queryKey: ['contractor-list'] });
                        showNotifSuccess({ message: data?.message || t($ => $.contractors.success.created) });
                        setConfirmationCreate(null);
                    },
                    onError: (error: any) => {
                        showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
                    },
                });
            },
            FormContractor,
            t,
            true,
            undefined,
            companyName
        );
    };

    const onCreateEmployeeHandler = (employeeName: string, companyName?: string, ePassport?: string) => {
        // Transform contractor data to options format
        const contractorOptions = contractorData?.map((contractor: any) => ({
            value: contractor.id,
            label: contractor.name,
        })) || [];

        // Find company ID if companyName matches
        let defaultCompanyId = "";
        if (companyName) {
            const matchedCompany = contractorData?.find((c: any) => c.name.toLowerCase() === companyName.toLowerCase());
            if (matchedCompany) {
                defaultCompanyId = matchedCompany.id;
            }
        }

        // Set default values
        const defaultValues = {
            employeeName: employeeName || "",
            subContractorId: defaultCompanyId,
            identityNumber: ePassport,
            statusOnDuty: true
        };

        onCreateEmployee(
            t,
            setConfirmationCreate,
            (body: Record<string, string>) => {
                employeeCreateMutation.mutate(
                    { body: { ...body, statusOnDuty: true } },
                    {
                        onSuccess: (data) => {
                            queryClient.invalidateQueries({ queryKey: ['employee-list'] });

                            if (id && data?.data?.employee?.id) {
                                resolveMutation.mutate({
                                    logId: id,
                                    passportNumber: ePassport || "",
                                    employeeId: data.data.employee.id
                                }, {
                                    onSuccess: (resolveData) => {
                                        showNotifSuccess({ message: resolveData.message || t($ => $.user.employee.pobSuggestionResolved) });
                                        queryClient.invalidateQueries({ queryKey: ['pobUnmatchedLogDetail', id] });
                                    },
                                    onError: (error: any) => {
                                        showNotifError({ message: error.message || t($ => $.user.employee.pobSuggestionResolveFailed) });
                                    }
                                });
                            }

                            showNotifSuccess({ message: data?.message || t($ => $.employee.smartCard.validation.createSuccess) });
                            setConfirmationCreate(null);
                        },
                        onError: (error: any) => {
                            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message });
                        },
                    }
                );
            },
            FormCreateEmployee,
            contractorOptions,
            defaultValues
        );
    };

    const handleResolve = (logId: string, passportNumber: string, suggestion: UnmatchedLogSuggestion) => {
        resolveMutation.mutate({
            logId: logId,
            passportNumber: passportNumber,
            employeeId: suggestion.id
        }, {
            onSuccess: (data) => {
                showNotifSuccess({ message: data.message || t($ => $.user.employee.pobSuggestionResolved) });
                queryClient.invalidateQueries({ queryKey: ['pobUnmatchedLogDetail', logId] });
            },
            onError: (error: any) => {
                showNotifError({ message: error.message || t($ => $.user.employee.pobSuggestionResolveFailed) });
            }
        });
    };

    const { data: response, isLoading, isError, error } = usePobUnmatchedLogDetail(id, {
        page,
        limit,
        filter: filterParams.filter,
        sortBy: filterParams.sortBy,
        orderBy: filterParams.orderBy
    });

    const { data: contractorData, isLoading: isContractorLoading } = useContractorGet();

    // Derive the currently resolving suggestion ID
    const resolvingSuggestionId = resolveMutation.isPending ? resolveMutation.variables?.employeeId : null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-2">
                    <AlertCircle className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{t($ => $.pobUnmatchedDetails.error.failedToLoad)}</h3>
                    <p className="text-muted-foreground max-w-[400px]">
                        {(error as Error).message || t($ => $.pobUnmatchedDetails.error.unexpectedError)}
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => window.history.back()}>
                        {t($ => $.pobUnmatchedDetails.error.goBack)}
                    </Button>
                    <Button onClick={() => window.location.reload()}>
                        {t($ => $.pobUnmatchedDetails.error.tryAgain)}
                    </Button>
                </div>
            </div>
        )
    }

    const logDetail = response?.data;
    const meta = response?.meta;

    if (!logDetail) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="p-4 rounded-full bg-muted text-muted-foreground mb-2">
                    <FileQuestion className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{t($ => $.pobUnmatchedDetails.error.logNotFound)}</h3>
                    <p className="text-muted-foreground max-w-[400px]">
                        {t($ => $.pobUnmatchedDetails.error.logNotFoundMessage)}
                    </p>
                </div>
                <Link to={AppRoute.employee.pobUnmatchedLogs.url}>
                    <Button variant="default">
                        {t($ => $.pobUnmatchedDetails.error.backToLogs)}
                    </Button>
                </Link>
            </div>
        )
    }



    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div>
                <Link to={AppRoute.employee.pobUnmatchedLogs.url}>
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        {t($ => $.pobUnmatchedLogs.back)}
                    </Button>
                </Link>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <History className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t($ => $.pobUnmatchedDetails.title)}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                            <span>{t($ => $.pobUnmatchedDetails.details.file)}: {logDetail.filename}</span>
                        </div>
                    </div>
                </div>
            </div>

            <PobUnmatchedStats data={logDetail} />

            <div className="space-y-4">
                <Card className="">
                    <CardContent className='flex flex-col px-4 gap-4 py-0'>
                        <div className="flex flex-col sm:flex-row gap-3 items-end justify-end">
                            <PopoverFilter
                                form={form}
                                onSubmit={onFilterSubmit}
                                loading={isLoading}
                                ContainerFilter={FilterPobUnmatched}
                                showSearch={false}
                                filterText={t($ => $.pobUnmatchedDetails.filters.filter)}
                                submitVariant={'outline'}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 w-full align-end justify-end">
                            {form.getValues()?.filter && (
                                <Badge variant="secondary" className="shadow-sm">
                                    {t($ => $.pobUnmatchedDetails.filters.filter)}: {
                                        filterOptions(t).find((option: any) => option.value === form?.getValues()?.filter)?.label || form?.getValues()?.filter
                                    }
                                </Badge>
                            )}
                            <Badge variant="secondary" className="shadow-sm">
                                {t($ => $.pobUnmatchedDetails.filters.sortBy)}: {
                                    sortByOptions(t).find((option: any) => option.value === form?.getValues()?.sortBy)?.label || form?.getValues()?.sortBy
                                } ({
                                    OrderbyOptions.find((option: any) => option.value === form?.getValues()?.orderBy)?.label || form?.getValues()?.orderBy
                                })
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <div id="items-container" className="grid gap-6">
                    {logDetail.data.length > 0 ? (
                        logDetail.data.map((entry, index) => (
                            <PobUnmatchedItem
                                key={`${page}-${index}-${entry.excelData["E-PASPORT"]}`}
                                entry={entry}
                                index={(page * limit) + index} // Calculate global index
                                logId={logDetail.id}
                                onCreateCompany={onCreateCompany}
                                onCreateEmployee={onCreateEmployeeHandler}
                                onResolve={(suggestion) => handleResolve(logDetail.id, entry.excelData["E-PASPORT"] || "", suggestion)}
                                resolvingSuggestionId={resolvingSuggestionId}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            {filterParams.filter === 'with_suggestion'
                                ? t($ => $.pobUnmatchedDetails.emptyStates.withSuggestions)
                                : t($ => $.pobUnmatchedDetails.emptyStates.withoutSuggestions)
                            }
                        </div>
                    )}
                </div>

                <div className="flex justify-center mt-8">
                    <DataTablePagination
                        pageIndex={page}
                        setPageIndex={setPage}
                        pageSize={limit}
                        setPageSize={setLimit}
                        rowsCount={meta?.total || 0}
                        paginationData={{
                            page: (page || 0) + 1,
                            limit: limit,
                            total: meta?.total || 0,
                            totalPages: meta?.totalPages || 0
                        }}
                        onPaginationChange={(newPagination) => {
                            setPage(newPagination.page - 1);
                            setLimit(newPagination.limit);
                            store.setPobUnmatchedDetails({
                                ...filterParams,
                                page: newPagination.page - 1,
                                limit: newPagination.limit
                            });
                            const itemsContainer = document.getElementById('items-container');
                            if (itemsContainer) {
                                itemsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }}
                        pageSizeOptions={[5, 10, 20, 50]}
                    />
                </div>
            </div>
            {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
        </div>
    )
}