import { DataTable, DataTableColumnHeader, useDataTable } from "@/components/custom/table";
import React, { useMemo, useState } from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { IoMenu } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CiTrash, CiEdit, CiLock } from "react-icons/ci";
import { LuShield, LuUser, LuSettings, LuBuilding2, LuPlus, LuShip } from "react-icons/lu";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AdminUser } from "@/service/admin-user/admin-user-list";

type Props = {
  data: AdminUser[];
  loading: boolean;
  dataLoading?: boolean;
  onCreateClicked: () => void;
  onDeleteClicked: (row: AdminUser) => void;
  onEditClicked: (row: AdminUser) => void;
  onPasswordChange: (row: AdminUser) => void;
  toolbarNew?: React.ReactNode;
  paginationData: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPaginationChange?: (pagination: { page: number; limit: number }) => void;
}

const TableUser = ({
  data,
  loading,
  dataLoading = false,
  onCreateClicked,
  onDeleteClicked,
  onEditClicked,
  onPasswordChange,
  toolbarNew,
  paginationData,
  onPaginationChange
}: Props) => {
  const { t } = useAppTranslation();
  const headerClassNames = "";

  const columns = useMemo(() => [
    createRowNumberColumn<AdminUser>({ accessorKey: "rowNum", id: "rowNum", paginationData: paginationData }),
    {
      accessorKey: "name",
      enableSorting: true,
      size: 150,
      meta: {
        label: t($ => $.admin.users.form.name.label),
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.admin.users.form.name.label)} className={`${headerClassNames}`} />)
      },
      cell: ({ cell, row }: any) => (
        <div>
          <div className={"break-all"}>
            {cell.getValue()}
          </div>
          <div className="break-all text-foreground/70">
            {row.original?.role === "employee" ? row.original?.hssePassportNumber : row.original?.email}
          </div>
        </div>
      )
    },
    {
      accessorKey: "role",
      size: 100,
      enableSorting: true,
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.admin.users.form.role.label)} className={`${headerClassNames}`} />)
      },
      meta: {
        label: t($ => $.admin.users.form.role.label),
      },
      cell: ({ cell }: any) => {
        const role_ = cell.getValue();

        if (role_ === "admin") {
          return (
            <Badge
              variant="subtle-destructive"
              className="px-3 py-1 font-medium text-xs rounded-full flex items-center w-fit"
            >
              <LuShield className="h-3 w-3 mr-1" />
              {role_?.charAt(0).toUpperCase() + role_?.slice(1)}
            </Badge>
          );
        }
        else if (role_ === "user") {
          return (
            <Badge
              variant="subtle-success"
              className="px-3 py-1 font-medium text-xs rounded-full flex items-center w-fit"
            >
              <LuUser className="h-3 w-3 mr-1" />
              {role_?.charAt(0).toUpperCase() + role_?.slice(1)}
            </Badge>
          );
        }
        else if (role_ === "contractor") {
          return (
            <Badge
              variant="subtle-info"
              className="px-3 py-1 font-medium text-xs rounded-full flex items-center w-fit"
            >
              <LuSettings className="h-3 w-3 mr-1" />
              {role_?.charAt(0).toUpperCase() + role_?.slice(1)}
            </Badge>
          );
        }

        // Default case for any other role
        return (
          <Badge
            variant="subtle-secondary"
            className="px-3 py-1 font-medium text-xs rounded-full flex items-center w-fit"
          >
            <LuUser className="h-3 w-3 mr-1" />
            {role_?.charAt(0).toUpperCase() + role_?.slice(1)}
          </Badge>
        );
      }
    },
    {
      accessorKey: "subContractors",
      header: t($ => $.admin.users.form.subContractors.label),
      enableSorting: false,
      meta: {
        label: t($ => $.admin.users.form.subContractors.label),
      },
      cell: ({ cell, row }: any) => {
        const subContractors = cell?.getValue() || [];
        const vessel = row.original?.vessel;
        const maxVisible = 2;
        const visibleItems = subContractors.slice(0, maxVisible);
        const remainingCount = subContractors.length - maxVisible;
        const [isPopoverOpen, setIsPopoverOpen] = useState(false);

        // Check if there are no contractors and no vessel
        if (subContractors.length === 0 && (!vessel || !vessel.name)) {
          return (
            <Badge variant="outline" className="text-muted-foreground border-border bg-muted/50 px-2 py-1 text-xs">
              {t($ => $.shared.noData)}
            </Badge>
          );
        }

        return (
          <div className="flex flex-wrap gap-1.5">
            {visibleItems.map((sc: any, index: number) => (
              <Badge
                key={sc.id}
                variant={
                  index % 3 === 0 ? "subtle-purple" :
                    index % 3 === 1 ? "subtle-indigo" :
                      "subtle-teal"
                }
                className="px-2.5 py-1 text-xs font-medium rounded-lg"
              >
                <LuBuilding2 className="h-3 w-3 mr-1" />
                {sc.name.length > 30 ? `${sc.name.substring(0, 30)}...` : sc.name}
              </Badge>
            ))}

            {remainingCount > 0 && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="outline"
                    className="px-2.5 py-1 text-xs font-medium rounded-lg border-2 border-dashed border-border bg-muted/50 text-muted-foreground hover:border-border/80 hover:bg-muted/70 transition-all duration-200 cursor-pointer"
                  >
                    <LuPlus className="h-3 w-3 mr-1" />
                    +{remainingCount} {t($ => $.labels.more)}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-3">
                    <h4 className="font-medium text-sm mb-2">{t($ => $.admin.users.form.subContractors.label)}</h4>
                    <div className="max-h-[300px] overflow-y-auto">
                      {subContractors.map((sc: any, index: number) => (
                        <div
                          key={sc.id}
                          className="flex items-center py-2 px-2 hover:bg-muted rounded-md transition-colors"
                        >
                          <LuBuilding2 className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{sc.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Display vessel information in the same column */}
            {vessel && vessel.name && (
              <Badge
                variant={'subtle-info'}
              >
                <LuShip className="h-3 w-3 mr-1" />
                {vessel.name} ({vessel.type})
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: "action",
      size: 80,
      enableSorting: false,
      header: ({ column }: any) => {
        return (<div className="flex items-center justify-center"><DataTableColumnHeader column={column} title={t($ => $.shared.actions)} className={`${headerClassNames}`} /></div>)
      },
      cell: ({ row }: any) => {
        const isDisabled = loading || dataLoading;

        // Local state for each dropdown menu
        const [isDropdownOpen, setIsDropdownOpen] = useState(false);

        return (
          <div
            className="text-center">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size={"icon"} disabled={isDisabled}><IoMenu /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="bottom" align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onEditClicked(row.original);
                    }}
                    disabled={isDisabled}
                  >
                    <CiEdit /> {t($ => $.shared.edit)}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onPasswordChange(row.original);
                    }}
                    disabled={isDisabled}
                  >
                    <CiLock /> {t($ => $.labels.changePassword)}
                  </DropdownMenuItem>
                  <Separator />
                  <DropdownMenuItem
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onDeleteClicked(row.original);
                    }}
                    className={"text-destructive"}
                    disabled={isDisabled}
                  >
                    <CiTrash className={"text-destructive"} /> {t($ => $.shared.delete)}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      meta: {
        label: t($ => $.shared.actions),
      }
    },

  ], [t, paginationData])

  const { table } = useDataTable({
    data: data || [],
    columns,
    pageCount: paginationData?.totalPages || -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["action"] },
      pagination: { pageIndex: (paginationData?.page || 1) - 1, pageSize: paginationData?.limit || 10 }, // Convert 1-based to 0-based
    },
    manualSorting: false,
    manualPagination: true,
    onPaginationChange: (updater: any) => {
      const nextPagination = typeof updater === "function" ? updater(table.getState().pagination) : updater;

      // Call parent pagination handler if provided
      if (onPaginationChange) {
        onPaginationChange({
          page: nextPagination.pageIndex + 1, // Convert 0-based to 1-based
          limit: nextPagination.pageSize,
        });
      }
    },
    manualFiltering: false,
  });

  return (
    <div className={""}>
      {data && <DataTable
        table={table}
        styles={{ container: { default: "border" } }}
        totalRowCount={paginationData.total ?? 0}
        paginationData={paginationData}
      >
      </DataTable>
      }
    </div>
  );
}

export default TableUser