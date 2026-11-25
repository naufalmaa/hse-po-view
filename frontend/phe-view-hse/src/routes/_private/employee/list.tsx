import { createFileRoute } from '@tanstack/react-router'
import * as React from "react";
import { AppRoute } from "@/constants/app-route";
import { SkeTable } from "@/components/custom/skeleton";
import { useNavigate } from '@tanstack/react-router'
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps, ProgressDialog } from "@/components/custom/components";
import { useEffect, useState } from "react";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X } from "lucide-react";
import { useAppTranslation } from '@/lib/i18n-typed';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { defaultStore, useAppStore } from '@/stores/useAppStore';
import { useForm } from "react-hook-form";
import { APP_CONFIG } from "@/constants/config";
import { ContainerFilter, CardSimpleEmployee, CardStatusEmployee, CardDetailsEmployee, TableEmployee, FilterBadges, FilterCompliance } from "@/components/pages/employee/list";
import { date_to_string, string_to_date } from "@/lib/my-utils";
import { useEmployeeCreate, useEmployeeDelete, useEmployeePut, useEmployeeImportTemplate } from "@/service/employee";
import { useEmployeeImportExcel, EmployeeImportExcelResponse } from "@/service/employee/employee-from-excels";
import { useEmployeeList, EmployeeListResponse } from "@/service/employee/employee-list";
import { useVesselGet } from "@/service/vessels-api";
import { useSubTypesList } from "@/service/sub-type-api";
import { createEmployeeFormData, createBodyParam as employeeCreateBodyParam } from "@/components/pages/employee/detail/template/employee";
import FormGeneral from "@/components/pages/employee/detail/FormGeneral";
import { useContractorGet } from "@/service/contractor-api";
import { useAuth } from "@/hooks/use-auth";
import { USER_ROLE } from "@/constants/app-enum";
import { useManageAttendance, useEmployeeLocations } from "@/service/employee/attendance-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LuGrid2X2, LuGrid3X3, LuUsers, LuUserPlus, LuFilter, LuFileSpreadsheet, LuGrid2X2Check, LuCreditCard, LuX } from "react-icons/lu";
import { Card, CardContent } from "@/components/ui/card";
import { isCrewString } from '@/types/auth';
import { BsCardChecklist, BsCardText } from 'react-icons/bs';
import { TbTableImport } from 'react-icons/tb';
import { ErrorTable } from "@/components/pages/employee/list/ErrorTable";


export const Route = createFileRoute('/_private/employee/list')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      statusOnDuty: search?.statusOnDuty as any,
      subContractorId: search?.subContractorId as any,
      projectId: search?.projectId as any,
      vesselId: search?.vesselId as any,
      location: search?.location as any,
      category: search?.category as any,
      complianceDocKey: search?.complianceDocKey as any,
      documentStatus: search?.documentStatus as string,
      ohihReview: search?.ohihReview as any,
      viewMode: search?.viewMode as string,
      fromDashboard: search?.fromDashboard as boolean,
      sortBy: search?.sortBy as string,
      orderBy: search?.orderBy as string,
    }
  },
})

function RouteComponent() {
  const searchParams = Route.useSearch();
  const { t } = useAppTranslation();
  const auth = useAuth();
  const userRole = auth?.user?.user?.role ?? USER_ROLE.contractor.value;
  const isAdmin = userRole === USER_ROLE.admin.value;

  const navigate = useNavigate()
  const [confirmationModal, setConfirmationModal] = useState<ModalProps | null>(null);
  const [confirmationCreate, setConfirmationCreate] = React.useState<ModalFormProps | null>(null);
  const [progressDialog, setProgressDialog] = useState({
    open: false,
    title: '',
    message: '' as string | React.ReactNode,
    progress: 0,
    status: 'processing' as 'processing' | 'success' | 'error'
  });
  const translatedEmployeeForm = createEmployeeFormData(t);
  const [formData, setFormData] = React.useState({
    ...translatedEmployeeForm,
    form: {
      ...translatedEmployeeForm.form,
      projectId: {
        ...translatedEmployeeForm.form.projectId,
        options: []
      },
      subContractorId: {
        ...translatedEmployeeForm.form.subContractorId,
        options: []
      },
      vesselId: {
        ...translatedEmployeeForm.form.vesselId,
        options: []
      }
    }
  });

  const [searchValue, setSearchValue] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [subTypes, setSubTypes] = useState<any>(null);
  const [vesselList, setVesselList] = useState<any>(null);
  const [contractorList, setContractorList] = useState<any>(null);

  const employeeListMutation = useEmployeeList();
  const employeeDeleteMutation = useEmployeeDelete();
  const employeeCreateMutation = useEmployeeCreate();
  const employeeImportExcelMutation = useEmployeeImportExcel();
  const employeeImportTemplateQuery = useEmployeeImportTemplate();
  const contractorListQuery = useContractorGet();
  const pageListVesselQuery = useVesselGet();
  const subTypesListQuery = useSubTypesList();
  const employeePutMutation = useEmployeePut();
  const manageAttendanceMutation = useManageAttendance();
  const employeeLocationsQuery = useEmployeeLocations();

  const locationList = employeeLocationsQuery.data
    ? employeeLocationsQuery.data.map((loc: any) => {
      const val = typeof loc === 'string' ? loc : (loc?.name || loc?.value || '');
      return {
        value: val,
        label: val,
      };
    }).filter((opt: any) => Boolean(opt.value))
    : [];

  const isLoading = () => {
    return (employeeListMutation.isPending || employeeDeleteMutation.isPending || employeeCreateMutation.isPending || employeeImportExcelMutation.isPending ||
      employeeImportTemplateQuery.isFetching || contractorListQuery.isPending || pageListVesselQuery.isPending || subTypesListQuery.isPending || employeePutMutation.isPending || employeeLocationsQuery.isPending);
  }

  const [openFilter, setOpenFilter] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const store = useAppStore();
  const initialFilter = store?.employeeList ?? defaultStore.employeeList;



  const parseParam = (param: any) => {
    if (Array.isArray(param)) return param;
    if (typeof param === 'string' && param.trim() !== '') {
      return param.includes(',') ? param.split(',') : [param];
    }
    return undefined;
  };

  const isFromDashboard = !!searchParams.fromDashboard;

  const form = useForm({
    defaultValues: {
      ...initialFilter,
      search: searchParams.search || (isFromDashboard ? "" : initialFilter.search) || "",
      category: parseParam(searchParams.category) || (isFromDashboard ? [] : initialFilter.category) || [],
      projectId: parseParam(searchParams.projectId) || (isFromDashboard ? [] : initialFilter.projectId) || [],
      subContractorId: parseParam(searchParams.subContractorId) || (isFromDashboard ? [] : initialFilter.subContractorId) || [],
      vesselId: parseParam(searchParams.vesselId) || (isFromDashboard ? [] : initialFilter.vesselId) || [],
      location: parseParam(searchParams.location) || (isFromDashboard ? [] : initialFilter.location) || [],
      statusOnDuty: parseParam(searchParams.statusOnDuty)?.map((v: any) => v === 'true' || v === true) || (isFromDashboard ? [] : initialFilter.statusOnDuty) || [],
      ohihReview: parseParam(searchParams.ohihReview) || (isFromDashboard ? [] : initialFilter.ohihReview) || [],
      complianceDocKey: parseParam(searchParams.complianceDocKey) || (isFromDashboard ? [] : initialFilter.complianceDocKey) || [],
      documentStatus: searchParams.documentStatus || (isFromDashboard ? "" : initialFilter.documentStatus) || "",
      sortBy: searchParams.sortBy || initialFilter.sortBy,
      orderBy: searchParams.orderBy || initialFilter.orderBy,
    }
  });

  useEffect(() => {
    form.reset({
      ...initialFilter,
      search: searchParams.search || (isFromDashboard ? "" : initialFilter.search) || "",
      category: parseParam(searchParams.category) || (isFromDashboard ? [] : initialFilter.category) || [],
      projectId: parseParam(searchParams.projectId) || (isFromDashboard ? [] : initialFilter.projectId) || [],
      subContractorId: parseParam(searchParams.subContractorId) || (isFromDashboard ? [] : initialFilter.subContractorId) || [],
      vesselId: parseParam(searchParams.vesselId) || (isFromDashboard ? [] : initialFilter.vesselId) || [],
      location: parseParam(searchParams.location) || (isFromDashboard ? [] : initialFilter.location) || [],
      statusOnDuty: parseParam(searchParams.statusOnDuty)?.map((v: any) => v === 'true' || v === true) || (isFromDashboard ? [] : initialFilter.statusOnDuty) || [],
      ohihReview: parseParam(searchParams.ohihReview) || (isFromDashboard ? [] : initialFilter.ohihReview) || [],
      complianceDocKey: parseParam(searchParams.complianceDocKey) || (isFromDashboard ? [] : initialFilter.complianceDocKey) || [],
      documentStatus: searchParams.documentStatus || (isFromDashboard ? "" : initialFilter.documentStatus) || "",
      sortBy: searchParams.sortBy || initialFilter.sortBy,
      orderBy: searchParams.orderBy || initialFilter.orderBy,
    });
  }, [searchParams, form, initialFilter, isFromDashboard]);

  const getViewIcon = ({ view }: { view: string }) => {
    if (view === "details") {
      return <BsCardText />;
    } else if (view === "simple") {
      return <LuCreditCard />;
    } else if (view === "status") {
      return <BsCardChecklist />;
    } else if (view === "tableSimple") {
      return <LuGrid2X2 />;
    } else if (view === "tableDetails") {
      return <LuGrid3X3 />;
    } else if (view === "tableStatus") {
      return <LuGrid2X2Check />;
    }
    else {
      // Default to list icon for any other view mode
      return <LuCreditCard />;
    }
  }

  const updateViewMode = (viewMode_: string) => {
    store.setEmployeeList({ ...store?.employeeList, viewMode: viewMode_ });
    setViewMode(viewMode_);
    setViewModeIcon(getViewIcon({ view: viewMode_ }));
  }

  const [viewMode, setViewMode] = useState(searchParams.viewMode || (searchParams.complianceDocKey ? "tableStatus" : (initialFilter?.viewMode ?? "simple")));
  const [viewModeIcon, setViewModeIcon] = useState<any>(getViewIcon({ view: searchParams.viewMode || (searchParams.complianceDocKey ? "tableStatus" : (initialFilter?.viewMode ?? "simple")) }));
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const createBodyForm = (body: Record<any, any> = {}) => {
    const selectByRange = String(body?.selectByRange ?? "").toLowerCase() === "true";
    if (body?.reset === true) {
      setSearchValue("");
    }
    let body_ = {
      ...body,
      selectByRange: selectByRange,
      date_start: (body?.reset === true || !selectByRange) ? "" : date_to_string(body?.date_start, APP_CONFIG.dayFormat),
      date_end: (body?.reset === true || !selectByRange) ? "" : date_to_string(body?.date_end, APP_CONFIG.dayFormat),
      search: (body?.reset === true) ? "" : body?.search,
    };

    const { date_start, date_end, ...newBody } = body_;
    return newBody;
  }
  useEffect(() => {
    if (userRole === USER_ROLE.contractor.value && !hasInitialized) return;

    // Sync form values with search parameters for compliance drill-down
    form.setValue("complianceDocKey", searchParams.complianceDocKey || "");
    form.setValue("documentStatus", searchParams.documentStatus || "");
    form.setValue("ohihReview", Array.isArray(searchParams.ohihReview) ? searchParams.ohihReview : (searchParams.ohihReview ? [searchParams.ohihReview] : []));

    // Refresh the list whenever these parameters change
    getEmployeeList(createBodyForm(form.getValues()));
  }, [searchParams.complianceDocKey, searchParams.documentStatus, searchParams.ohihReview, hasInitialized, userRole]);

  useEffect(() => {
    if (hasInitialized) return;

    if (userRole !== USER_ROLE.contractor.value) {
      setHasInitialized(true);
    } else if (contractorListQuery.data && contractorListQuery.data.length > 0) {
      const contractorCompany = contractorListQuery.data[0];
      
      form.setValue('subContractorId', [contractorCompany.id]);
      
      if (contractorCompany.category) {
        const cat = contractorCompany.category.toLowerCase();
        form.setValue('category', [cat]);
        if (cat === 'marine') {
          form.setValue('projectId', []);
        } else if (cat === 'project') {
          form.setValue('vesselId', []);
        }
      }

      getEmployeeList(createBodyForm(form.getValues()));
      setHasInitialized(true);
    }
  }, [contractorListQuery.data, userRole, hasInitialized]);

  useEffect(() => {
    if (searchParams.viewMode) {
      updateViewMode(searchParams.viewMode);
    }
  }, [searchParams.viewMode]);

  const createDetailsSearchParams = () => {
    const category = form.getValues("category").join(",");
    const statusOnDuty = form.getValues("statusOnDuty").join(",");
    const ohihReview = form.getValues("ohihReview").join(",");
    return {
      category,
      statusOnDuty,
      ohihReview
    }
  }

  useEffect(() => {
    if (contractorListQuery.data || pageListVesselQuery.data || subTypesListQuery.data) {
      const translatedEmployeeForm = createEmployeeFormData(t);

      // Create updated form data with contractor, vessel, and sub-types options
      const updatedFormData = {
        ...translatedEmployeeForm,
        form: {
          ...translatedEmployeeForm.form,
          subContractorId: {
            ...translatedEmployeeForm.form.subContractorId,
            options: contractorListQuery.data
              ? contractorListQuery.data.map((item: any) => ({
                value: item.id,
                label: item.name
              }))
              : []
          },
          vesselId: {
            ...translatedEmployeeForm.form.vesselId,
            options: pageListVesselQuery.data
              ? pageListVesselQuery.data.map((item: any) => ({
                value: item.id,
                label: item.vesselName,
                personnelCount: item.personnelCount
              }))
              : []
          },
          projectId: {
            ...translatedEmployeeForm.form.projectId,
            options: subTypesListQuery.data
              ? subTypesListQuery.data.map((item: any) => ({
                value: item.id,
                label: item.name
              }))
              : []
          }
        }
      };

      // Update subTypes state
      if (contractorListQuery.data) {
        const newContractorOptions = contractorListQuery.data.map((item: any) => ({
          value: item.id,
          label: item.name
        }));
        setContractorList(newContractorOptions);
      }

      if (pageListVesselQuery.data) {
        const newVesselOptions = pageListVesselQuery.data.map((item: any) => ({
          value: item.id,
          label: item.vesselName,
          personnelCount: item.personnelCount
        }));
        setVesselList(newVesselOptions);
      }

      if (subTypesListQuery.data) {
        const newSubTypeOptions = subTypesListQuery.data.map((item: any) => ({
          value: item.id,
          label: item.name
        }));
        setSubTypes(newSubTypeOptions);
      }

      setFormData(updatedFormData);
    }
  }, [pageListVesselQuery.data, contractorListQuery.data, subTypesListQuery.data, t]);

  const getEmployeeList = (body: Record<any, any> = {}) => {
    employeeListMutation.mutate({
      body: body
    }, {
      onSuccess: (response: EmployeeListResponse) => {
        store.setEmployeeList({ ...body, selectByRange: body?.selectByRange?.toString(), reset: false });
      },
      onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
    })
  }

  const createNewEmployee = (body: Record<string, any>) => {
    const formData = new FormData();
    for (const key in body) {
      formData.append(key, body[key]);
    }

    employeeCreateMutation.mutate(
      { body: formData },
      {
        onSuccess: (response: any) => {
          getEmployeeList(createBodyForm(form.getValues()));
          showNotifSuccess({ message: response?.message || t($ => $.employeeList.successUpdatedEmployee) });
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    )
  }

  const importEmployeesFromExcel = (file: File) => {
    // Show progress dialog
    setProgressDialog({
      open: true,
      title: t($ => $.employeeList.importEmployees),
      message: t($ => $.employeeList.processingExcelFile),
      progress: 0,
      status: 'processing'
    });

    const formData = new FormData();
    formData.append('file', file);

    employeeImportExcelMutation.mutate(
      { body: formData },
      {
        onSuccess: (response: EmployeeImportExcelResponse) => {
          getEmployeeList(createBodyForm(form.getValues()));

          // Determine dialog status based on error rows
          const hasErrorRows = response?.data?.errorRows > 0;
          const dialogStatus = hasErrorRows ? 'error' : 'success';
          const dialogTitle = hasErrorRows ? t($ => $.dialog.error) : t($ => $.dialog.success);

          // Prepare base message
          let message = t($ => $.employeeList.successImportEmployees, {
            totalRows: response?.data?.totalRows || 0,
            insertedRows: response?.data?.insertedRows || 0,
            errorRows: response?.data?.errorRows || 0
          });

          // Add error details if available
          let dialogMessage: string | React.ReactNode = message;
          if (response?.data?.errors?.length > 0) {
            const totalErrors = response.data.errors.length;
            const baseMessage = message + `\n\n${t($ => $.employeeList.totalErrors)}: ${totalErrors}`;

            // Create a custom message with the ErrorTable component
            dialogMessage = (
              <div>
                <div>{baseMessage}</div>
                <ErrorTable errors={response.data.errors} />
              </div>
            );
          }

          // Show dialog with appropriate status
          setProgressDialog({
            open: true,
            title: dialogTitle,
            message: dialogMessage,
            progress: 100,
            status: dialogStatus
          });
        },
        onError: (error: any) => {
          // Show error dialog instead of notification
          setProgressDialog({
            open: true,
            title: t($ => $.dialog.error),
            message: error?.response?.data?.message ?? error?.message,
            progress: 0,
            status: 'error'
          });
        }
      }
    )
  }

  const formDataRef = React.useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const onDataCreatedClicked = React.useCallback(() => {
    setConfirmationCreate({
      title: t($ => $.employeeList.addEmployeeTitle),
      desc: t($ => $.employeeList.addEmployeeDescription),
      defaultValue: formData.defaultValue,
      child: formData.form,
      schema: formData.schema,
      content: <FormGeneral isFormCreate={true} />,
      onCancelClick: () => setConfirmationCreate(null),
      onConfirmClick: (body: Record<string, any>) => {
        const newBody = employeeCreateBodyParam("", body);
        createNewEmployee(newBody?.data);
        setConfirmationCreate(null);
      },
    });
  }, [formData, t]);

  const onImportExcelClicked = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      importEmployeesFromExcel(file);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onDownloadTemplateClicked = () => {
    employeeImportTemplateQuery.refetch().then((result) => {
      if (result.data) {
        // Create a blob URL for the Excel file
        const url = window.URL.createObjectURL(new Blob([result.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'employee-import-template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    }).catch((error) => {
      showNotifError({ message: error?.response?.data?.message ?? error?.message ?? t($ => $.employeeList.errorDownloadingTemplate) });
    });
  };

  const onDeleteData = (item: any) => {
    setConfirmationModal({
      title: t($ => $.employeeList.deleteEmployeeTitle),
      content: <div>{t($ => $.employeeList.deleteEmployeeConfirmation)} <span
        className={"font-bold text-primary"}>{item?.employeeName}</span> ?</div>,
      textConfirm: t($ => $.employeeList.delete),
      textCancel: t($ => $.employeeList.cancel),
      onConfirmClick: () => {
        employeeDeleteMutation.mutate(
          { body: { employeeId: item?.id } },
          {
            onSuccess: (response: any) => {
              if (response?.success === false) {
                // Show confirmation dialog for hard delete with connection details
                const connections = response?.data?.connections;
                const connectionInfo = connections ? (
                  <div className="mt-3 p-3 bg-gray-100 rounded-md">
                    <p className="font-semibold mb-2">Data terkait yang akan dihapus:</p>
                    <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(connections).map(([key, value]) => (
                        <li key={key}>{key}: {value as number} record{value != 1 ? 's' : ''}</li>
                      ))}
                    </ul>
                  </div>
                ) : null;

                setConfirmationModal({
                  title: t($ => $.employeeList.hardDeleteTitle),
                  content: (
                    <div>
                      {response?.message}
                      {connectionInfo}
                      <div className="mt-3">{t($ => $.employeeList.hardDeleteConfirmation)}</div>
                    </div>
                  ),
                  textConfirm: t($ => $.employeeList.yesHardDelete),
                  textCancel: t($ => $.employeeList.noCancel),
                  onConfirmClick: () => {
                    // Call employeeDeleteMutation with hardDelete=true
                    employeeDeleteMutation.mutate(
                      { body: { employeeId: item?.id, hardDelete: true } },
                      {
                        onSuccess: (hardDeleteResponse: any) => {
                          getEmployeeList(createBodyForm(form.getValues()));
                          showNotifSuccess({ message: hardDeleteResponse?.message });
                        },
                        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message }),
                      }
                    );
                    setConfirmationModal(null);
                  },
                  onCancelClick: () => setConfirmationModal(null),
                });
              } else {
                getEmployeeList(createBodyForm(form.getValues()));
                showNotifSuccess({ message: response?.message });
              }
            },
            onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message }),
          }
        );
        setConfirmationModal(null);
      },
      onCancelClick: () => setConfirmationModal(null),
    })
  }

  const onFilterSubmit = (body: Record<any, any> = {}) => {
    const body_form = createBodyForm({ ...body, page: 0 });

    navigate({
      search: (prev: any) => ({
        ...prev,
        ...body,
        complianceDocKey: undefined,
        documentStatus: undefined,
        page: 0
      }),
    } as any);

    getEmployeeList(body_form);
    setOpenFilter(false);
  }

  const onEmployeeUpdated = (employeeId: string, body: any) => {
    const formDataQuery = new FormData();

    if (body["key"] === "general") {
      for (const key in body["data"]) {
        formDataQuery.append(key, body["data"][key]);
      }
    } else {
      formDataQuery.append(body["key"], JSON.stringify(body["data"]));
      for (let i = 0; i < body?.files?.length; i++) {
        const file = body?.files[i];
        formDataQuery.append(body?.fileKey[i], file)
      }
    }

    employeePutMutation.mutate(
      { id: employeeId, body: formDataQuery },
      {
        onSuccess: (response: any) => {
          getEmployeeList(createBodyForm(form.getValues()));
          showNotifSuccess({ message: response?.message || t($ => $.employeeList.successUpdatedData) });
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
      }
    )
  }

  const onManageAttendance = (body: any) => {
    manageAttendanceMutation.mutate(body, {
      onSuccess: (response: any) => {
        getEmployeeList(createBodyForm(form.getValues()));
        showNotifSuccess({ message: response?.message || t($ => $.employeeList.successUpdatedData) });
      },
      onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message })
    });
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuUsers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.employeeList.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.employeeList.pageDescription)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">

            <div className="flex flex-row gap-2">
              {[USER_ROLE.admin.value, USER_ROLE.user.value, USER_ROLE.contractor.value].includes(userRole) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={isLoading()}
                      variant="default"
                    >
                      <LuUserPlus className="h-4 w-4 mr-2" />
                      {t($ => $.employeeList.addEmployee)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={onDataCreatedClicked}>
                        <LuUserPlus className="mr-2 h-4 w-4" />
                        <span>{t($ => $.employeeList.addEmployee)}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onImportExcelClicked}>
                        <TbTableImport className="mr-2 h-4 w-4" />
                        <span>{t($ => $.employeeList.importEmployees)}</span>
                        {employeeImportExcelMutation.isPending && (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onDownloadTemplateClicked}>
                        <LuFileSpreadsheet className="mr-2 h-4 w-4" />
                        <span>{t($ => $.employeeList.downloadTemplate)}</span>
                        {employeeImportTemplateQuery.isFetching && (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {employeeListMutation.isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <LuUsers className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-destructive">{t($ => $.employeeList.errorLoadingEmployees)}</h3>
                <p className="text-sm text-destructive/80 mt-1">
                  {employeeListMutation?.error?.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(employeeListMutation.isPending || employeeDeleteMutation.isPending) && (
        <Card className="shadow-lg border-border">
          <CardContent className="p-8">
            <SkeTable />
          </CardContent>
        </Card>
      )}

      {/* Employee Table */}
      {employeeListMutation.isSuccess && (
        <Card className="shadow-lg border-border">
          <CardContent className="flex flex-col px-4 gap-4">
            <div className='flex flex-row gap-4 justify-end px-2 items-center'>
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t($ => $.employeeList.searchTooltip)}</p>
                    <p className="text-xs text-muted/80">{t($ => $.employeeList.searchSubmitTooltip)}</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  placeholder={t($ => $.employeeList.searchPlaceholder)}
                  value={searchValue || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      form.setValue('search', searchValue);
                      getEmployeeList(createBodyForm({ ...form.getValues(), reset: false, search: searchValue }));
                    }
                  }}
                  className="pl-8 pr-8 w-full"
                />
                {searchValue && (
                  <X
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => {
                      setSearchValue('');
                      form.setValue('search', '');
                      getEmployeeList(createBodyForm({ ...form.getValues(), search: '' }));
                    }}
                  />
                )}
              </div>

              <DropdownMenu open={viewMenuOpen} onOpenChange={setViewMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isLoading()}
                    className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                  >
                    <span className="mr-2">{viewModeIcon}</span>
                    {t($ => $.employeeList.view)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="" align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => { updateViewMode("simple"); setViewMenuOpen(false); }}
                      className={viewMode === "simple" ? "bg-accent text-accent-foreground" : ""}
                    >
                      <LuCreditCard className="mr-2 h-4 w-4" /> {t($ => $.employeeList.viewSimple)}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { updateViewMode("details"); setViewMenuOpen(false); }}
                      className={viewMode === "details" ? "bg-accent text-accent-foreground" : ""}
                    >
                      <BsCardText className="mr-2 h-4 w-4" /> {t($ => $.employeeList.viewDetails)}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { updateViewMode("status"); setViewMenuOpen(false); }}
                      className={viewMode === "status" ? "bg-accent text-accent-foreground" : ""}
                    >
                      <BsCardChecklist className="mr-2 h-4 w-4" /> {t($ => $.employeeList.viewStatus)}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { updateViewMode("tableSimple"); setViewMenuOpen(false); }}
                      className={viewMode === "tableSimple" ? "bg-accent text-accent-foreground" : ""}
                    >
                      <LuGrid2X2 className="mr-2 h-4 w-4" /> {t($ => $.employeeList.viewTableSimple)}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { updateViewMode("tableDetails"); setViewMenuOpen(false); }}
                      className={viewMode === "tableDetails" ? "bg-accent text-accent-foreground" : ""}
                    >
                      <LuGrid3X3 className="mr-2 h-4 w-4" /> {t($ => $.employeeList.viewTableDetails)}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { updateViewMode("tableStatus"); setViewMenuOpen(false); }}
                      className={viewMode === "tableStatus" ? "bg-accent text-accent-foreground" : ""}
                    >
                      <LuGrid2X2Check className="mr-2 h-4 w-4" /> {t($ => $.employeeList.viewTableStatus)}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover open={openFilter} onOpenChange={setOpenFilter}>
                <PopoverTrigger asChild>
                  <Button
                    disabled={isLoading()}
                    variant="outline"
                    className="bg-card border-border hover:bg-accent/50 transition-all duration-200"
                  >
                    {isLoading() ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LuFilter className="h-4 w-4 mr-2" />
                    )}
                    {t($ => $.employeeList.filter)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <ContainerFilter
                    form={form}
                    subtypes={subTypes}
                    onSubmit={onFilterSubmit}
                    setOpenFilter={setOpenFilter}
                    userRole={userRole}
                    vesselList={vesselList}
                    locationList={locationList}
                    contractorList={contractorList}
                    companiesData={contractorListQuery.data}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant={searchParams.complianceDocKey?.length > 0 ? "default" : "outline"}
                size="sm"
                className="h-9 gap-2"
                onClick={() => {
                  navigate({
                    to: AppRoute.employee.list.url,
                    search: (prev: any) => ({
                      ...prev,
                      complianceDocKey: prev.complianceDocKey ? undefined : ['BPJS', 'Contract', 'Vaccine', 'SIKA', 'MCU', 'BSS', 'BST', 'Competency Certificate'],
                      documentStatus: undefined
                    })
                  });
                }}
              >
                <LuFileSpreadsheet className="h-4 w-4" />
                Compliance
              </Button>

            </div>

            {/* Filter Badges Row */}
            <FilterBadges
              form={form}
              subTypes={subTypes}
              vesselList={vesselList}
              contractorList={contractorList}
              locationList={locationList}
              onFilterSubmit={onFilterSubmit}
              setSearchValue={setSearchValue}
              searchParams={searchParams}
            />
            <FilterCompliance
              searchParams={searchParams}
              navigate={navigate}
            />

            <div className="rounded-lg overflow-hidden">
              {viewMode === "status" ? (
                <CardStatusEmployee
                  enableAction={!isCrewString(userRole)}
                  isAdmin={isAdmin}
                  onEmployeeUpdated={onEmployeeUpdated}
                  data={employeeListMutation?.data}
                  onDetailClicked={(id_: string) => navigate({
                    to: AppRoute.employee.detail.url, search: { id: id_, ...createDetailsSearchParams() }
                  })}
                  onDeleteClicked={(item: any) => onDeleteData(item)}
                  onPaginationChange={(v: { page: number; limit: number }) => {
                    form.setValue("page", v.page - 1);
                    form.setValue("limit", v.limit);
                    getEmployeeList(createBodyForm(form.getValues()));
                  }}
                  paginationData={{
                    page: (employeeListMutation?.data?.meta?.page ?? 0) + 1,
                    limit: employeeListMutation?.data?.meta?.view ?? 0,
                    total: employeeListMutation?.data?.meta?.total ?? 0,
                    totalPages: employeeListMutation?.data?.meta?.totalPages ?? 0,
                  }}
                  formData={formData} // Pass formData to CardStatusEmployee
                  userRole={userRole}
                  onManageAttendance={onManageAttendance}
                />
              ) : viewMode === "details" ? (
                <CardDetailsEmployee
                  enableAction={!isCrewString(userRole)}
                  isAdmin={isAdmin}
                  onEmployeeUpdated={onEmployeeUpdated}
                  data={employeeListMutation?.data}
                  onDetailClicked={(id_: string) => navigate({
                    to: AppRoute.employee.detail.url, search: { id: id_, ...createDetailsSearchParams() }
                  })}
                  onDeleteClicked={(item: any) => onDeleteData(item)}
                  onPaginationChange={(v: { page: number; limit: number }) => {
                    form.setValue("page", v.page - 1);
                    form.setValue("limit", v.limit);
                    getEmployeeList(createBodyForm(form.getValues()));
                  }}
                  paginationData={{
                    page: (employeeListMutation?.data?.meta?.page ?? 0) + 1,
                    limit: employeeListMutation?.data?.meta?.view ?? 0,
                    total: employeeListMutation?.data?.meta?.total ?? 0,
                    totalPages: employeeListMutation?.data?.meta?.totalPages ?? 0,
                  }}
                  formData={formData} // Pass formData to CardDetailsEmployee
                  userRole={userRole}
                  onManageAttendance={onManageAttendance}
                />
              ) : viewMode === "tableSimple" || viewMode === "tableDetails" || viewMode === "tableStatus" ? (
                <TableEmployee
                  viewMode={viewMode}
                  enableAction={!isCrewString(userRole)}
                  isAdmin={isAdmin}
                  onEmployeeUpdated={onEmployeeUpdated}
                  data={employeeListMutation?.data}
                  onDetailClicked={(id_: string) => navigate({
                    to: AppRoute.employee.detail.url, search: { id: id_, ...createDetailsSearchParams() }
                  })}
                  onDeleteClicked={(item: any) => onDeleteData(item)}
                  onPaginationChange={(v: { page: number; limit: number }) => {
                    form.setValue("page", v.page - 1);
                    form.setValue("limit", v.limit);
                    getEmployeeList(createBodyForm(form.getValues()));
                  }}
                  paginationData={{
                    page: (employeeListMutation?.data?.meta?.page ?? 0) + 1,
                    view: employeeListMutation?.data?.meta?.view ?? 0,
                    limit: employeeListMutation?.data?.meta?.view ?? 0,
                    total: employeeListMutation?.data?.meta?.total ?? 0,
                    totalPages: employeeListMutation?.data?.meta?.totalPages ?? 0,
                  }}
                  formData={formData} // Pass formData to TableEmployee
                  userRole={userRole}
                  onManageAttendance={onManageAttendance}
                />
              ) : (
                // Default to ListViewEmployee when viewMode is any other value
                <CardSimpleEmployee
                  enableAction={!isCrewString(userRole)}
                  isAdmin={isAdmin}
                  onEmployeeUpdated={onEmployeeUpdated}
                  data={employeeListMutation?.data}
                  onDetailClicked={(id_: string) => navigate({
                    to: AppRoute.employee.detail.url, search: { id: id_, ...createDetailsSearchParams() }
                  })}
                  onDeleteClicked={(item: any) => onDeleteData(item)}
                  onPaginationChange={(v: { page: number; limit: number }) => {
                    form.setValue("page", v.page - 1);
                    form.setValue("limit", v.limit);
                    getEmployeeList(createBodyForm(form.getValues()));
                  }}
                  paginationData={{
                    page: (employeeListMutation?.data?.meta?.page ?? 0) + 1,
                    limit: employeeListMutation?.data?.meta?.view ?? 0,
                    total: employeeListMutation?.data?.meta?.total ?? 0,
                    totalPages: employeeListMutation?.data?.meta?.totalPages ?? 0,
                  }}
                  formData={formData} // Pass formData to ListViewEmployee
                  userRole={userRole}
                  onManageAttendance={onManageAttendance}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {confirmationModal && <DialogModal modal={confirmationModal} variantSubmit={"destructive"} />}
      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      <ProgressDialog
        open={progressDialog.open}
        title={progressDialog.title}
        message={progressDialog.message}
        progress={progressDialog.progress}
        status={progressDialog.status}
        onClose={() => setProgressDialog(prev => ({ ...prev, open: false }))}
        onConfirm={() => {
          if (progressDialog.status === 'success') {
            setProgressDialog(prev => ({ ...prev, open: false }));
          } else if (progressDialog.status === 'error') {
            setProgressDialog(prev => ({ ...prev, open: false }));
            // Retry logic could be added here if needed
          }
        }}
      />
    </div>
  )
}
