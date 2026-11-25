import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { SkeTable } from "@/components/custom/skeleton";
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps } from "@/components/custom/components";
import { useQueryClient } from '@tanstack/react-query';
import { useState } from "react";
import { useContractorGetV2, useContractorDelete, useContractorCreate, useContractorUpdate } from "@/service/contractor-api";
import { useContractorVesselAssign, useContractorVesselRemove } from "@/service/contractor-vessel";
import { useVesselGet, useVesselCreate } from "@/service/vessels-api";
import { TableContractorVessels, FormContractorVessel } from "@/components/pages/contractor-vessel";
import { FormContractor } from "@/components/pages/contractors";
import { onContractorCreated, onContractorUpdated } from "@/components/pages/contractors/templates/contractor-template";
import { onContractorVesselCreated, onContractorVesselDeleted, onContractorDeleted, onContractorVesselUpdated } from "@/components/pages/contractor-vessel/templates/contractor-vessel-template";
import { onVesselsCreated } from "@/components/pages/vessels/templates/vessels-template";
import { FormEdit } from "@/components/pages/vessels";
import { LuPlus, LuSailboat, LuBuilding } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useForm } from "react-hook-form";
import { defaultStore, useAppStore } from '@/stores/useAppStore';
import { IoIosGitNetwork } from 'react-icons/io';
import { AppRoute } from '@/constants/app-route';

export const Route = createFileRoute(
  '/_private/_contractor-vessel/contractor-vessels',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const store = useAppStore();

  // Initialize form with default values from store or defaults
  const initialFilter = store?.contractorVesselList ?? defaultStore.contractorVesselList;

  // Initialize view mode - now fixed to 'table'
  const [viewMode] = useState<'table'>('table');

  // Prepare query parameters with defaults
  const queryParams = {
    search: initialFilter?.search ?? '',
    category: "marine"
  };

  // Use the contractor API with proper parameters
  const pageListQuery = useContractorGetV2(queryParams);
  // Fetch contractor and vessel options
  const { data: vesselData } = useVesselGet({ unassigned: true });

  const form = useForm({
    defaultValues: {
      ...initialFilter,
      page: initialFilter?.page ?? 0,
      limit: initialFilter?.limit ?? 10,
    }
  });

  const pageAssignMutation = useContractorVesselAssign();
  const pageRemoveMutation = useContractorVesselRemove();
  const contractorDeleteMutation = useContractorDelete();
  const pageCreateContractorMutation = useContractorCreate();
  const pageUpdateContractorMutation = useContractorUpdate();

  // Add vessel creation mutation
  const pageCreateVesselMutation = useVesselCreate();

  const [confirmationVesselCreate, setConfirmationVesselCreate] = useState<ModalFormProps | null>(null);
  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);
  const [confirmationContractorCreate, setConfirmationContractorCreate] = useState<ModalFormProps | null>(null);
  const [confirmationMappingUpdate, setConfirmationMappingUpdate] = useState<ModalFormProps | null>(null);
  const [confirmationContractorUpdate, setConfirmationContractorUpdate] = useState<ModalFormProps | null>(null);

  const isLoading = () => {
    return (pageListQuery.isPending || pageAssignMutation.isPending || pageRemoveMutation.isPending);
  }

  // Add search state
  const [searchValue, setSearchValue] = React.useState<string>(initialFilter?.search || '');

  // Load initial data with pagination
  const loadContractors = (page: number = 0, limit: number = 10, search: string = '') => {
    // Create a new object without page and limit from form values to avoid duplication
    const { page: formPage, limit: formLimit, search: formSearch, category: formCategory, ...formValues } = form.getValues();

    // Update the query parameters
    const newQueryParams = {
      search: search || formSearch || '',
      category: "marine"
    };

    // Since we're using useQuery, we don't manually trigger it
    // But we still store the parameters for persistence
    store.setContractorVesselList({
      ...newQueryParams,
      viewMode
    });
  };

  // Load data on component mount
  React.useEffect(() => {
    loadContractors(0, initialFilter?.limit ?? 10);
  }, []);

  // Transform contractor data to options format
  const contractorOptions = React.useMemo(() => {
    if (!pageListQuery?.data?.data) return [];
    return pageListQuery?.data?.data.map((contractor: any) => ({
      value: contractor.id,
      label: contractor.name
    }));
  }, [pageListQuery.data]);

  // Transform vessel data to options format
  const vesselOptions = React.useMemo(() => {
    if (!vesselData) return [];
    return vesselData.map((vessel: any) => ({
      value: vessel.id,
      label: vessel.vesselName
    }));
  }, [vesselData]);

  const onVesselCreated = () => {
    onVesselsCreated(
      t,
      setConfirmationVesselCreate,
      (body: Record<string, string>) => {
        pageCreateVesselMutation.mutate({ body }, {
          onSuccess: (data) => {
            showNotifSuccess({ message: data?.message || t($ => $.vessels.createSuccess) || "Vessel created successfully" });
            queryClient.invalidateQueries({ queryKey: ['vessel-list'] });
            setConfirmationVesselCreate(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormEdit
    );
  };

  const onDeleteVesselMapping = (item: any, vessel: Record<string, any>) => {
    onContractorVesselDeleted(
      t,
      item,
      vessel,
      setConfirmationDelete,
      (body: Record<string, string>) => {
        pageRemoveMutation.mutate(
          { body },
          {
            onSuccess: (data) => {
              queryClient.invalidateQueries({ queryKey: ['vessel-list'] });
              loadContractors(form.getValues("page"), form.getValues("limit"));
              showNotifSuccess({ message: data?.message || t($ => $.contractorVessel.deleteSuccess) });
            },
            onError: (error: any) => showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message }),
          }
        );
      }
    );
  }

  const onDeleteContractor = (contractor: any) => {
    // Show confirmation dialog for contractor deletion
    onContractorDeleted(
      t,
      contractor,
      setConfirmationDelete,
      (body: Record<string, string>) => {
        contractorDeleteMutation.mutate(
          { body },
          {
            onSuccess: (data) => {
              queryClient.invalidateQueries({ queryKey: ['contractor-list-v2'] });
              queryClient.invalidateQueries({ queryKey: ['vessel-list'] });
              showNotifSuccess({ message: data?.message || t($ => $.contractorVessel.deleteSuccess) });
            },
            onError: (error: any) => showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message }),
          }
        );
      }
    );
  }

  const onMappingCreated = () => {
    onContractorVesselCreated(
      t,
      setConfirmationCreate,
      (body: Record<string, string>) => {
        pageAssignMutation.mutate({ body }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['contractor-list-v2'] });
            queryClient.invalidateQueries({ queryKey: ['vessel-list'] });
            showNotifSuccess({ message: data?.message || t($ => $.contractorVessel.createSuccess) });
            setConfirmationCreate(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormContractorVessel,
      contractorOptions,
      vesselOptions
    );
  };

  const onMappingUpdated = (item: any) => {
    onContractorVesselUpdated(
      t,
      item,
      setConfirmationMappingUpdate,
      (body: Record<string, string>) => {
        // For update, we need to remove the existing mapping and create a new one
        // This is because the API doesn't have a direct update endpoint
        pageAssignMutation.mutate(
          { body },
          {
            onSuccess: () => {
              // After removing, assign the new mapping
              pageAssignMutation.mutate({ body }, {
                onSuccess: (data) => {
                  queryClient.invalidateQueries({ queryKey: ['contractor-list-v2'] });
                  queryClient.invalidateQueries({ queryKey: ['vessel-list'] });
                  showNotifSuccess({ message: data?.message || t($ => $.contractorVessel.updateSuccess) });
                  setConfirmationMappingUpdate(null);
                },
                onError: (error: any) => {
                  showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
                },
              });
            },
            onError: (error: any) => {
              showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
            },
          }
        );
      },
      FormContractorVessel,
      contractorOptions,
      vesselOptions
    );
  };

  const handleContractorCreate = () => {
    onContractorCreated(
      setConfirmationContractorCreate,
      (body: Record<string, string>) => {
        pageCreateContractorMutation.mutate({ body }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['contractor-list-v2'] });
            showNotifSuccess({ message: data?.message || t($ => $.contractors.success.created) });
            setConfirmationContractorCreate(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormContractor,
      t,
      false, // Pass showCategory as false since we don't want to show category in this context
      "marine" // Pass defaultCategory as "marine" since that's what we want to use
    );
  };

  // Add the onEditContractor function
  const onEditContractor = (item: any) => {
    onContractorUpdated(
      item,
      setConfirmationContractorUpdate,
      (id: string, body: Record<string, string>) => {
        pageUpdateContractorMutation.mutate({ body: { ...body, id } }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['contractor-list-v2'] });
            showNotifSuccess({ message: data?.message || t($ => $.contractors.success.updated) });
            setConfirmationContractorUpdate(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormContractor,
      t,
      false, // Pass showCategory as false since we don't want to show category in this context
      "marine" // Pass defaultCategory as "marine" since that's what we want to use
    );
  };

  // Handle search submission
  const handleSearchSubmit = (search: string) => {
    form.setValue('search', search);
    loadContractors(0, form.getValues("limit"), search); // Reset to first page when searching
  };

  // Clear search
  const clearSearch = () => {
    setSearchValue('');
    handleSearchSubmit('');
  };

  const ViewAddContractorVessel = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"default"}
            disabled={isLoading()}
            className="bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
          >
            {isLoading() ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
            ) : (
              <LuPlus className="mr-2 h-4 w-4" />
            )}
            {t($ => $.contractorVessel.quickAction)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onMappingCreated}>
            <IoIosGitNetwork className="mr-2 h-4 w-4" />
            {t($ => $.contractorVessel.addContractorVessel)}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onVesselCreated}>
            <LuPlus className="mr-2 h-4 w-4" />
            {t($ => $.vessels.addVessel)}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleContractorCreate}>
            <LuBuilding className="mr-2 h-4 w-4" />
            {t($ => $.contractors.addContractor)}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: AppRoute.dataManagement.vessel.list.url })}>
            <LuSailboat className="mr-2 h-4 w-4" />
            {t($ => $.contractorVessel.vessels)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuSailboat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.contractorVessel.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.contractorVessel.pageSubtitle)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* {pageListQuery.isSuccess && (
              <Badge variant="secondary" className="px-3 py-1">
                <LuLayers className="h-3 w-3 mr-1" />
                {pageListQuery.data?.meta?.total || 0} {t($ => $.contractorVessel.vessels)}
              </Badge>
            )} */}
            <ViewAddContractorVessel />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <Card className="shadow-lg border-border">
        <CardContent className="px-2">
          {pageListQuery.isPending && (
            <div className="p-8">
              <SkeTable />
            </div>
          )}

          {pageListQuery.isError && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <LuSailboat className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t($ => $.shared.failed)} {t($ => $.contractorVessel.pageTitle)}</h3>
              <p className="text-destructive">{pageListQuery?.error?.message}</p>
            </div>
          )}

          {pageListQuery.isSuccess && (
            <div className="flex flex-col gap-2">
              {/* Search */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end px-4">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t($ => $.contractorVessel.searchTooltip)}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    placeholder={t($ => $.contractorVessel.searchPlaceholder)}
                    value={searchValue || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        handleSearchSubmit(searchValue);
                      }
                    }}
                    className="pl-8 pr-8 w-full"
                  />
                  {searchValue && (
                    <X
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={clearSearch}
                    />
                  )}
                </div>
              </div>

              <TableContractorVessels
                data={pageListQuery.data?.data || []}
                onUnMapVesselClicked={(item: any, vessel: Record<string, any>) => onDeleteVesselMapping(item, vessel)}
                onDeleteContractor={onDeleteContractor}
                onEditMappingClicked={onMappingUpdated}
                onEditContractorClicked={onEditContractor}
                loading={isLoading()}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {confirmationVesselCreate && <DialogModalForm modal={confirmationVesselCreate} />}
      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      {confirmationContractorCreate && <DialogModalForm modal={confirmationContractorCreate} />}
      {confirmationMappingUpdate && <DialogModalForm modal={confirmationMappingUpdate} />}
      {confirmationContractorUpdate && <DialogModalForm modal={confirmationContractorUpdate} />}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}