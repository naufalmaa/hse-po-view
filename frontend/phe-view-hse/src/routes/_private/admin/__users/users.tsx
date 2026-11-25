import { createFileRoute } from '@tanstack/react-router'
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { SkeTable } from "@/components/custom/skeleton";
import { DialogModal, DialogModalForm, ModalFormProps, ModalProps } from "@/components/custom/components";
import { FormUserAdd, TableUser, FormUserEdit, FormPasswordUpdate, onUserCreated, onUserUpdated, onUserPasswordChanged } from '@/components/pages/admin/user';
import { CardStatsUser } from '@/components/pages/admin/user/CardStatsUser';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdminChangePassword,
  useAdminUserCreate,
  useAdminUserDelete,
  useAdminUserPut
} from "@/service/admin-users-api";
import { useAdminUserList, AdminUser } from "@/service/admin-user/admin-user-list";
import { useEffect, useState } from "react";
import { useContractorGet } from "@/service/contractor-api";
import { useContractorVesselList } from "@/service/contractor-vessel";
import { LuUserPlus, LuUsers, LuShield } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useAppStore } from "@/stores/useAppStore";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute('/_private/admin/__users/users')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation()
  const queryClient = useQueryClient();
  const store = useAppStore();

  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);
  const [confirmationUpdatePassword, setConfirmationUpdatePassword] = useState<ModalFormProps | null>(null);
  const [subContractorOptions, setSubContractorOptions] = useState([]);
  const [subContractorVesselOptions, setSubContractorVesselOptions] = useState([]);
  const [vesselOptionsMap, setVesselOptionsMap] = useState<{ [key: string]: any[] }>({});
  const [searchValue, setSearchValue] = useState(store?.adminUserList?.search || "");

  // Initialize adminUserList config in AppStore if it doesn't exist
  useEffect(() => {
    if (!store.adminUserList) {
      store.setAdminUserList({
        page: 0,
        limit: 10,
        search: ""
      });
    } else {
      // Initialize local search value with store value
      setSearchValue(store.adminUserList.search || "");
    }
  }, [store.adminUserList, store.setAdminUserList]);

  // Update search value in store when user presses Enter
  const handleSearchSubmit = () => {
    // First update the store with the new search value
    store.setAdminUserList({
      ...store?.adminUserList,
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
    store.setAdminUserList({
      ...store?.adminUserList,
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

  const userListQuery = useAdminUserList({
    page: (store?.adminUserList?.page || 0) + 0, // Convert 0-based to 1-based
    limit: store?.adminUserList?.limit || 10,
    search: store?.adminUserList?.search || ""
  });


  const userCreateMutation = useAdminUserCreate();
  const userPutMutation = useAdminUserPut();
  const userDeleteMutation = useAdminUserDelete();
  const userUpdatePasswordMutation = useAdminChangePassword();
  const contractorListQuery = useContractorGet();
  const contractorVesselListQuery = useContractorVesselList();

  const isLoading = () => {
    return (
      (userDeleteMutation.isPending || userCreateMutation.isPending || userPutMutation.isPending || userListQuery.isPending)
    )
  }

  useEffect(() => {
    if (contractorListQuery.isSuccess) {
      const options = contractorListQuery.data.map((item: any) => ({
        value: item.id,
        label: item.name
      }));
      setSubContractorOptions(options);
    }
  }, [contractorListQuery.isSuccess, contractorListQuery.data]);

  useEffect(() => {
    // Fetch contractor-vessel data
    contractorVesselListQuery.mutate({ body: {} }, {
      onSuccess: (data) => {
        // Process data for sub_contractor_vessel dropdown
        const contractorOptions = data.data.map((item: any) => ({
          value: item.contractor.id,
          label: item.contractor.name
        }));
        setSubContractorVesselOptions(contractorOptions);

        // Process data for vesselId dropdown - create a map by contractorId
        const vesselMap: { [key: string]: any[] } = {};
        data.data.forEach((item: any) => {
          vesselMap[item.contractor.id] = item.vessels.map((vessel: any) => ({
            value: vessel.id,
            label: `${vessel.vesselName} (${vessel.type})`
          }));
        });
        setVesselOptionsMap(vesselMap);
      },
      onError: (error) => {
        console.error("Error fetching contractor-vessel data:", error);
      }
    });
  }, []);

  const onDeleteData = (item: AdminUser) => {
    setConfirmationDelete({
      title: t($ => $.admin.users.deleteUser.title),
      desc: t($ => $.admin.users.deleteUser.description),
      content: <div>{t($ => $.admin.users.deleteUser.confirmationPrefix)}<span
        className={"font-bold text-primary"}>{item?.email ?? ""}</span>{t($ => $.admin.users.deleteUser.confirmationSuffix)}</div>,
      textConfirm: t($ => $.admin.users.deleteUser.confirmText),
      textCancel: t($ => $.admin.users.deleteUser.cancelText),
      onConfirmClick: () => {
        userDeleteMutation.mutate(
          { body: { userId: item?.id } },
          {
            onSuccess: (data) => {
              queryClient.invalidateQueries({ queryKey: ['admin-user-list'] });
              showNotifSuccess({ message: data?.message || t($ => $.admin.users.deleteUser.successMessage) });
            },
            onError: (error: any) => showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message }),
          }
        );
        setConfirmationDelete(null);
      },
      onCancelClick: () => setConfirmationDelete(null),
    })
  }

  const onDataCreated = () => {
    onUserCreated(
      setConfirmationCreate,
      (body: Record<string, any>) => {
        userCreateMutation.mutate({ body }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-user-list'] });
            showNotifSuccess({ message: data?.message || t($ => $.admin.users.createUser.successMessage) });
            setConfirmationCreate(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormUserAdd,
      subContractorOptions,
      subContractorVesselOptions,
      vesselOptionsMap,
      t
    );
  };

  const onDataPut = (item: AdminUser) => {
    onUserUpdated(
      item,
      setConfirmationPut,
      (id: string, body: Record<string, any>) => {
        userPutMutation.mutate({ id, body }, {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-user-list'] });
            showNotifSuccess({ message: data?.message || t($ => $.admin.users.updateUser.successMessage) });
            setConfirmationPut(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormUserEdit,
      subContractorOptions,
      t
    );
  };

  const onPasswordChange = (item: AdminUser) => {
    onUserPasswordChanged(
      item,
      setConfirmationUpdatePassword,
      (body: Record<string, any>) => {
        userUpdatePasswordMutation.mutate({ body }, {
          onSuccess: (data) => {
            showNotifSuccess({ message: data?.message || t($ => $.admin.users.updatePassword.successMessage) });
            setConfirmationUpdatePassword(null);
          },
          onError: (error: any) => {
            showNotifError({ message: (error?.response?.data?.message || error?.response?.data?.error) ?? error?.message })
          },
        });
      },
      FormPasswordUpdate,
      t
    );
  }

  // Handle pagination changes
  const handlePaginationChange = (pagination: { page: number; limit: number }) => {
    store.setAdminUserList({
      ...store?.adminUserList,
      page: pagination.page - 1, // Convert 1-based to 0-based
      limit: pagination.limit
    });
  };

  const ViewAddUser = () => {
    const isDataLoading = contractorListQuery.isPending || contractorVesselListQuery.isPending;

    return (
      <Button
        variant={"default"}
        onClick={onDataCreated}
        disabled={isLoading() || isDataLoading}
        className="bg-primary hover:bg-primary/90 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
      >
        {isLoading() || isDataLoading ? (
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
        ) : (
          <LuUserPlus className="mr-2 h-4 w-4" />
        )}
        {t($ => $.shared.userAdd)}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LuUsers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.admin.users.pageTitle)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.admin.users.pageSubtitle)}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">

            <div className="flex items-center space-x-3">
              {userListQuery.isSuccess && (
                <Badge variant="secondary" className="px-3 py-1">
                  <LuShield className="h-3 w-3 mr-1" />
                  {userListQuery.data?.meta?.total || 0} {t($ => $.admin.users.userCount)}
                </Badge>
              )}
              <ViewAddUser />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <CardStatsUser
        summary={userListQuery.data?.summary}
        isLoading={userListQuery.isPending || !userListQuery.isSuccess}
      />

      {/* Content Section */}
      <Card className="shadow-lg border-border">
        <CardContent className="p-0">
          {(userListQuery.isPending || contractorListQuery.isPending) && (
            <div className="p-8">
              <SkeTable />
            </div>
          )}

          {userListQuery.isError && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <LuUsers className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t($ => $.admin.users.errorLoading)}</h3>
              <p className="text-destructive">{userListQuery?.error?.message}</p>
            </div>
          )}

          {(userListQuery.isSuccess && contractorListQuery.isSuccess && contractorVesselListQuery.isSuccess) && (
            <div className="flex flex-col gap-4 rounded-lg overflow-hidden px-6">
              <div className="w-full flex items-center gap-4 justify-end pt-1">
                <div className="relative sm:w-64">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t($ => $.admin.users.searchTooltip)}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    placeholder={t($ => $.admin.users.searchPlaceholder)}
                    value={searchValue || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-8 pr-8 w-full"
                  />
                  {searchValue && (
                    <X
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={handleClearSearch}
                    />
                  )}
                </div>
              </div>
              <TableUser
                data={userListQuery?.data?.data}
                onCreateClicked={onDataCreated}
                onEditClicked={onDataPut}
                onDeleteClicked={(item: AdminUser) => onDeleteData(item)}
                onPasswordChange={(item: AdminUser) => onPasswordChange(item)}
                loading={isLoading()}
                dataLoading={false}
                paginationData={{
                  page: (userListQuery?.data?.meta?.page + 1) || 1,
                  limit: userListQuery?.data?.meta?.limit || 10,
                  total: userListQuery?.data?.meta?.total || 0,
                  totalPages: userListQuery?.data?.meta?.totalPages || 1
                }}
                onPaginationChange={handlePaginationChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
      {confirmationUpdatePassword && <DialogModalForm modal={confirmationUpdatePassword} />}
      {confirmationDelete && <DialogModal modal={confirmationDelete} variantSubmit={"destructive"} />}
    </div>
  )
}