import { createFileRoute } from '@tanstack/react-router'
import { SkeTable } from "@/components/custom/skeleton";
import { useContractorCreate, useContractorUpdate, useContractorDelete, useContractorGetV3 } from "@/service/contractor-api";
import { TableContractors, FormContractor, onContractorCreated, onContractorUpdated, onContractorDeleted } from "@/components/pages/contractors";
import { DialogModalForm, ModalFormProps, DialogModal, ModalProps } from "@/components/custom/components";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from "react";
import { LuFolderOpen, LuLayers, LuPlus, LuBuilding, LuSearch, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useAppStore } from "@/stores/useAppStore";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute('/_private/_contractors/contractors')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const store = useAppStore();

  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationUpdate, setConfirmationUpdate] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);
  const [searchValue, setSearchValue] = useState(store?.contractorList?.search || "");

  // Initialize contractorList config in AppStore if it doesn't exist
  useEffect(() => {
    if (!store.contractorList) {
      store.setContractorList({
        page: 0,
        limit: 10,
        search: "",
        category: "project,mitra,null"
      });
    } else {
      // Initialize local search value with store value
      setSearchValue(store.contractorList.search || "");
    }
  }, [store.contractorList, store.setContractorList]);

  // Update search value in store when user presses Enter
  const handleSearchSubmit = () => {
    // First update the store with the new search value
    store.setContractorList({
      ...store?.contractorList,
      page: 0, // Reset to first page when searching
      search: searchValue
    });
  };

  // Update local search value as user types (but don't trigger search yet)
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchValue("");
    store.setContractorList({
      ...store?.contractorList,
      page: 0,
      search: ""
    });
  };

  // Handle search on Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const pageListQuery = useContractorGetV3({
    page: (store?.contractorList?.page || 0) + 0, // Convert 0-based to 1-based
    limit: store?.contractorList?.limit || 10,
    search: store?.contractorList?.search || "",
    category: store?.contractorList?.category || "project,mitra,null"
  });

  const pageCreateMutation = useContractorCreate();
  const pageUpdateMutation = useContractorUpdate();
  const pageDeleteMutation = useContractorDelete();

  const isLoading = () => {
    return (pageListQuery.isPending || pageCreateMutation.isPending || pageUpdateMutation.isPending || pageDeleteMutation.isPending);
  }

  // Handle pagination changes
  const handlePaginationChange = (pagination: { page: number; limit: number }) => {
    store.setContractorList({
      ...store?.contractorList,
      page: pagination.page - 1, // Convert 1-based to 0-based
      limit: pagination.limit
    });
  };

  const ViewAddContractor = () => {
    return (
      <Button
        variant={"default"}
        onClick={onDataCreated}
        disabled={isLoading()}
        className="bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
      >
        {isLoading() ? (
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
        ) : (
          <LuPlus className="mr-2 h-4 w-4" />
        )}
        {t($ => $.contractors.addContractor)}
      </Button>
    );
  }

  const onDataCreated = () => {
    onContractorCreated(
      setConfirmationCreate,
      (body: Record<string, string>) => {
        pageCreateMutation.mutate({ body }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['contractor-list-v3'] });
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
      true // Pass showCategory as true since we want to show category in this context
      // No defaultCategory needed since we're showing the field
    );
  };

  const onEditData = (item: any) => {
    onContractorUpdated(
      item,
      setConfirmationUpdate,
      (id: string, body: Record<string, string>) => {
        pageUpdateMutation.mutate({ body: { ...body, id } }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['contractor-list-v3'] });
            showNotifSuccess({ message: data?.message || t($ => $.contractors.success.updated) });
            setConfirmationUpdate(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormContractor,
      t,
      true // Pass showCategory as true since we want to show category in this context
      // No defaultCategory needed since we're showing the field
    );
  };

  const onDeleteData = (item: any) => {
    onContractorDeleted(
      item,
      setConfirmationDelete,
      (id: string) => {
        pageDeleteMutation.mutate({ body: { id } }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['contractor-list-v3'] });
            showNotifSuccess({ message: data?.message || t($ => $.contractors.success.deleted) });
            setConfirmationDelete(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      t,
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuBuilding className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.contractors.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.contractors.pageSubtitle)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {pageListQuery.isSuccess && (
              <Badge variant="secondary" className="px-3 py-1">
                <LuLayers className="h-3 w-3 mr-1" />
                {pageListQuery.data?.meta?.total || 0} {t($ => $.contractors.contractors)}
              </Badge>
            )}
            <ViewAddContractor />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <Card className="shadow-lg border-border">
        <CardContent className="px-0 py-2">
          {pageListQuery.isPending && (
            <div className="p-8">
              <SkeTable />
            </div>
          )}

          {pageListQuery.isError && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <LuFolderOpen className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t($ => $.contractors.errorLoading)}</h3>
              <p className="text-destructive">{pageListQuery?.error?.message}</p>
            </div>
          )}

          {pageListQuery.isSuccess && (
            <div className="flex flex-col gap-4 rounded-lg overflow-hidden px-6">
              <div className="w-full flex items-center gap-4 justify-end pt-1">
                <div className="relative sm:w-64">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <LuSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t($ => $.contractors.searchTooltip)}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    placeholder={t($ => $.contractors.searchPlaceholder)}
                    value={searchValue || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-8 pr-8 w-full"
                  />
                  {searchValue && (
                    <LuX
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={handleClearSearch}
                    />
                  )}
                </div>
              </div>
              <TableContractors
                data={pageListQuery?.data?.data || []}
                loading={isLoading()}
                onEditClicked={onEditData}
                onDeleteClicked={onDeleteData}
                paginationData={{
                  page: (pageListQuery?.data?.meta?.page || 0) + 1, // Convert 0-based to 1-based
                  limit: pageListQuery?.data?.meta?.limit || 10,
                  total: pageListQuery?.data?.meta?.total || 0,
                  totalPages: pageListQuery?.data?.meta?.totalPages || 1
                }}
                onPaginationChange={handlePaginationChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      {confirmationUpdate && <DialogModalForm modal={confirmationUpdate} />}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}