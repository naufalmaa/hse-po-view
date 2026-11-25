import { createFileRoute } from '@tanstack/react-router';
import * as React from "react";
import { ContractMetrics, DialogCreateContract, DialogUpdateContract, FilterContract, TableContract, CardContract } from '@/components/pages/csms/contract-management/management';
import { sortByOptions } from '@/components/pages/csms/contract-management/management/FilterContract';
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useEffect, useState, useCallback } from 'react';
import {
  useDeleteContract
} from '@/service/csms/contract-management-api';
import { useContracts } from '@/service/csms/contracts';
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Loader, Plus, Users, Table as TableIcon, Grid3X3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { DialogModal } from '@/components/custom/components';
import { defaultStore, useAppStore } from '@/stores/useAppStore';
import { useForm } from "react-hook-form";
import { PopoverFilter } from '@/components/app/PopoverFilter';
import { Badge } from '@/components/ui/badge';
import { OrderbyOptions } from "@/constants/app-enum";
import { useContractorGet } from '@/service/contractor-api';
import { useAppTranslation } from '@/lib/i18n-typed';
import { useAuth } from '@/hooks/use-auth';
import { isAdminOrUser } from '@/types/auth';

export const Route = createFileRoute('/_private/csms/_contract-management/contract-management')({
  component: RouteComponent,
  });

interface ContractProps {
  data: any[];
  overallMetrics: Record<string, any>;
  meta: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
  };
}
function RouteComponent() {
  const { t } = useAppTranslation();
  const auth = useAuth();
  const userRole = auth?.user;

  const { data: contractorData, isLoading: contractorsLoading, isError: contractorsError } = useContractorGet();
  const { mutate: loadContracts, isPending: contractsLoading, isError: contractsError, error: contractsLoadError } = useContracts();
  const { mutate: deleteContract, isPending: deleteContractLoading } = useDeleteContract();

  const [contracts, setContracts] = useState<ContractProps | null>(null);
  const [showCreateContractDialog, setShowCreateContractDialog] = useState(false);
  const [showUpdateContractDialog, setShowUpdateContractDialog] = useState(false);
  const [selectedContractForEdit, setSelectedContractForEdit] = useState<any>(null);
  const [viewMode, setViewMode] = React.useState<'table' | 'card'>('card'); // Add view mode state
  const [deleteConfirmation, setDeleteConfirmation] = React.useState<{ contractId: string; contractTitle: string } | null>(null); // Add delete confirmation state

  // Add store and form for contract management filters
  const store = useAppStore();
  const initialFilter = store?.contractManagement ?? defaultStore.contractManagement;
  const form = useForm({
    defaultValues: {
      ...initialFilter
    }
  });

  // Unified function to load contracts with proper error handling
  const loadContractsData = useCallback((filters: any = {}, showNotification = false) => {
    const requestBody = createBodyForm(filters);
    loadContracts(requestBody, {
      onSuccess: (data: any) => {
        setContracts(data);
        if (showNotification) {
          showNotifSuccess({ message: data?.message || t($ => $.contractManagement.refreshSuccess) });
        }

        store.setContractManagement({ ...requestBody, page: 0, search: "" });
      },
      onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
    });
  }, [loadContracts]);

  const createBodyForm = (body: Record<any, any> = {}) => {
    // Check if all contractors are selected
    const selectedContractorIds = body?.subContractorId || [];
    const allContractorsSelected = contractorData && selectedContractorIds.length === contractorData.length;

    return {
      ...body,
      // If all contractors are selected, send empty array to backend
      subContractorId: allContractorsSelected ? [] : selectedContractorIds
    };
  };

  const searchInput = {
    placeholder: t($ => $.contractManagement.searchPlaceholder),
    label: "",
    className: "",
    tooltipTitle: t($ => $.contractManagement.form.title.label),
    tooltip: t($ => $.contractManagement.searchTooltip)
  };

  // Load contracts on component mount
  useEffect(() => {
    // Handle the case where all contractors were previously selected
    // If the stored subContractorId is empty but we have contractor data,
    // it might mean all were previously selected
    const initialFilters = { ...initialFilter };
    // Initialize view mode from store, default to 'card' if not set or invalid
    const storedViewMode = initialFilter.viewMode;
    if (storedViewMode === 'table' || storedViewMode === 'card') {
      setViewMode(storedViewMode);
    } else {
      setViewMode('card');
    }
    loadContractsData(initialFilters);
  }, []);

  const isLoading = () => {
    return (contractorsLoading || contractsLoading);
  }

  const handleCreateContractClick = () => {
    setShowCreateContractDialog(true);
  };

  // Handle edit contract
  const handleEditContract = (contract: any) => {
    setSelectedContractForEdit(contract);
    setShowUpdateContractDialog(true);
  };

  // Handle delete contract confirmation
  const handleDeleteContract = (contractId: string, contractTitle: string) => {
    setDeleteConfirmation({ contractId, contractTitle });
  };

  // Confirm delete contract
  const confirmDeleteContract = () => {
    if (!deleteConfirmation) return;

    deleteContract(deleteConfirmation.contractId, {
      onSuccess: (data: any) => {
        // Reload contracts after successful deletion
        loadContractsData(form.getValues());
        showNotifSuccess({ message: data?.message || t($ => $.contractManagement.deleteSuccess) });
        setDeleteConfirmation(null);
      },
      onError: (error: any) => {
        showNotifError({ message: (error?.response?.data?.message ?? error?.message) || t($ => $.contractManagement.deleteError) });
        setDeleteConfirmation(null);
      }
    });
  };

  const onFilterSubmit = (values: Record<string, any>) => {
    const filters = {
      ...values,
      page: 0
    };
    loadContractsData(filters);
  };

  // Handle view mode change
  const handleViewModeChange = (newViewMode: string) => {
    // Validate that the newViewMode is either 'table' or 'card'
    if (newViewMode === 'table' || newViewMode === 'card') {
      setViewMode(newViewMode);
      // Save view mode to store
      const currentFilters = form.getValues();
      store.setContractManagement({
        ...currentFilters,
        viewMode: newViewMode
      });
    }
  };

  // Prepare contractor options for the filter
  const contractorOptions = (contractorData || []).map((contractor: Record<string, any>) => ({
    value: contractor.id,
    label: contractor.name
  }));

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.contractManagement.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.contractManagement.pageSubtitle)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isAdminOrUser(userRole) && <Button
              variant={"default"}
              onClick={handleCreateContractClick}
              disabled={isLoading()}
              className="bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
            >
              {isLoading() ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t($ => $.contractManagement.addContract)}
            </Button>}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {(contractorsError || contractsError) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <FileText className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-destructive">{t($ => $.contractManagement.errorLoading)}</h3>
                <p className="text-sm text-destructive/80 mt-1">
                  {contractsLoadError?.message || t($ => $.contractManagement.errorLoading)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading() && (
        <Card className="shadow-lg border-border">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">{t($ => $.contractManagement.loading)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Section */}
      {!isLoading() && !contractorsError && !contractsError && contracts?.overallMetrics && (
        <div className="p-0">
          <ContractMetrics
            overallMetrics={contracts?.overallMetrics}
            contractsCount={contracts?.data?.length || 0}
          />
        </div>
      )}

      {/* Contract Management Dashboard */}
      {!isLoading() && !contractorsError && !contractsError && (
        <>
          <Card className="">
            {/* <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-6 w-6" />
                Contracts
              </CardTitle>
            </CardHeader> */}
            <CardContent className='flex flex-col px-4 gap-4 py-0'>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-3 items-end justify-end">
                  <PopoverFilter
                    form={form}
                    onSubmit={onFilterSubmit}
                    loading={contractsLoading}
                    ContainerFilter={FilterContract}
                    showSearch={true}
                    filterText={t($ => $.contractManagement.filters.filter)}
                    contractorOptions={contractorOptions} // Pass contractor options to FilterContract
                    searchInput={searchInput}
                    submitVariant={'outline'}
                  />
                </div>

                {/* Filter Tags */}
                <div className="flex flex-wrap gap-2 w-full align-end justify-end">
                  {form.getValues()?.search && (
                    <Badge variant="secondary" className="shadow-sm">
                      Search: {form.getValues()?.search}
                    </Badge>
                  )}
                  {form?.getValues()?.subContractorId && form?.getValues()?.subContractorId?.length > 0 && (
                    <Badge variant="secondary" className="shadow-sm">
                      Contractors: {
                        (() => {
                          const selectedContractorIds = form.getValues().subContractorId || [];
                          // Check if all contractors are selected
                          const allContractorsSelected = contractorData && selectedContractorIds.length === contractorData.length;

                          if (allContractorsSelected) {
                            return t($ => $.contractManagement.allContractors);
                          }

                          const selectedContractors = contractorOptions.filter((option: any) =>
                            selectedContractorIds.includes(option.value)
                          );

                          if (selectedContractors.length > 1) {
                            return `${selectedContractors.slice(0, 1).map((c: any) => c.label).join(', ')}, +${selectedContractors.length - 1} more`;
                          }
                          return selectedContractors.map((c: any) => c.label).join(', ');
                        })()
                      }
                    </Badge>
                  )}
                  <Badge variant="secondary" className="shadow-sm">
                    {t($ => $.contractManagement.sortBy)}: {
                      sortByOptions(t).find((option: any) => option.value === form?.getValues()?.sort)?.label || form?.getValues()?.sort
                    } ({
                      OrderbyOptions.find((option: any) => option.value === form?.getValues()?.order)?.label || form?.getValues()?.order
                    })
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conditional rendering based on view mode - outside of main Card */}
          <div className="flex flex-col gap-2">
            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={handleViewModeChange} className='items-end'>
              <TabsList>
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  {t($ => $.contractManagement.tableView)}
                </TabsTrigger>
                <TabsTrigger value="card" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  {t($ => $.contractManagement.cardView)}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {viewMode === 'table' ? (
              <div className="rounded-lg border border-border bg-background">
                <TableContract
                  isEnableAction={isAdminOrUser(userRole)}
                  data={contracts?.data || []}
                  isLoading={contractorsLoading || contractsLoading}
                  onEditContract={(contract) => handleEditContract(contract)} // Pass the entire contract object
                  onDeleteContract={handleDeleteContract}
                  onReloadContracts={() => loadContractsData(form.getValues())} // Pass the reload function
                  paginationData={{
                    page: (contracts?.meta?.page ?? 0) + 1, // Convert 0-based to 1-based
                    view: contracts?.meta?.view || 10,
                    total: contracts?.meta?.total || 0,
                    totalPages: contracts?.meta?.totalPages || 0
                  }}
                  onPaginationChange={(pagination) => {
                    const currentFilters = form.getValues();
                    const newFilters = {
                      ...currentFilters,
                      page: pagination.page - 1 // Convert to 0-based index
                    };
                    loadContractsData(newFilters);
                  }}
                />
              </div>
            ) : (
              <CardContract
                isEnableAction={isAdminOrUser(userRole)}
                data={contracts?.data || []}
                isLoading={contractorsLoading || contractsLoading}
                paginationData={{
                  page: (contracts?.meta?.page ?? 0) + 1, // Convert 0-based to 1-based
                  view: contracts?.meta?.view || 10,
                  total: contracts?.meta?.total || 0,
                  totalPages: contracts?.meta?.totalPages || 0
                }}
                onPaginationChange={(pagination) => {
                  const currentFilters = form.getValues();
                  const newFilters = {
                    ...currentFilters,
                    page: pagination.page - 1 // Convert to 0-based index
                  };
                  loadContractsData(newFilters);
                }}
                onEditContract={(contract) => handleEditContract(contract)} // Pass the entire contract object
                onDeleteContract={handleDeleteContract}
                onReloadContracts={() => loadContractsData(form.getValues())} // Pass the reload function
              />
            )}
          </div>
        </>
      )}

      {/* Contract Creation Modal */}
      <DialogCreateContract
        open={showCreateContractDialog}
        onOpenChange={setShowCreateContractDialog}
        onSuccess={() => loadContractsData(form.getValues())}
      />

      {/* Contract Update Modal */}
      <DialogUpdateContract
        open={showUpdateContractDialog}
        onOpenChange={setShowUpdateContractDialog}
        contract={selectedContractForEdit}
        onSuccess={() => loadContractsData(form.getValues())}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <DialogModal
          modal={{
            title: t($ => $.contractManagement.confirmDeletion),
            desc: (
              <div className="space-y-4">
                <div>{t($ => $.contractManagement.deleteConfirmation).replace("{TITLE}", deleteConfirmation.contractTitle)}</div>
                <div className="text-sm text-gray-500">{t($ => $.contractManagement.deleteWarning)}</div>
                {deleteContractLoading && (
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2" />
                    {t($ => $.contractManagement.deletingContract)}
                  </div>
                )}
              </div>
            ),
            textConfirm: t($ => $.contractManagement.delete),
            textCancel: t($ => $.contractManagement.cancel),
            onConfirmClick: deleteContractLoading ? undefined : confirmDeleteContract,
            onCancelClick: deleteContractLoading ? undefined : () => setDeleteConfirmation(null),
          }}
          onDismissOutside={false}
        />
      )}
    </div>
  );
}