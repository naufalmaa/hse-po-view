import React, { useMemo, useState } from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Button } from "@/components/ui/button";
import { CiTrash, CiEdit } from "react-icons/ci";
import { DataTable, useDataTable } from "@/components/custom/table";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import { PiNetwork } from "react-icons/pi";
import { IoIosGitNetwork } from "react-icons/io";
import { IoMenu } from "react-icons/io5";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  data: any[];
  loading: boolean;
  onUnMapVesselClicked: (item: any, vessel: Record<string, any>) => void;
  onDeleteContractor?: (contractor: any) => void;
  onEditMappingClicked?: (item: any) => void;
  onEditContractorClicked?: (item: any) => void;
  toolbarNew?: React.ReactNode;
}

const TableContractorVessels = ({
  data,
  loading,
  onUnMapVesselClicked,
  onDeleteContractor,
  onEditMappingClicked,
  onEditContractorClicked, // Add this line
  toolbarNew,
}: Props) => {
  const { t } = useAppTranslation();

  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum" }),
    {
      accessorKey: "name",
      meta: {
        label: t($ => $.contractorVessel.name)
      },
      header: t($ => $.contractorVessel.name),
      enableSorting: true,
      size: 200,
    },
    {
      accessorKey: "vessels",
      meta: {
        label: t($ => $.contractorVessel.vessels)
      },
      header: t($ => $.contractorVessel.vessels),
      enableSorting: true,
      size: 200,
      cell: ({ row }: any) => {
        const vessels = row.original.vessels;
        const [showAllVessels, setShowAllVessels] = useState(false);

        if (!vessels || vessels.length === 0) {
          return (
            <div className="text-muted-foreground italic">
              {t($ => $.contractorVessel.noVesselsAssigned)}
            </div>
          );
        }

        // Show first 2 vessels
        const displayedVessels = vessels.slice(0, 2);
        const remainingCount = vessels.length - 2;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
              {displayedVessels.map((v: any, index: number) => (
                <Badge
                  key={v.id || index}
                  variant="secondary"
                  className="rounded-sm px-2 py-1 text-xs font-normal flex items-center gap-1 group bg-secondary text-secondary-foreground dark:bg-gray-700 dark:text-gray-200"
                >
                  <span className="truncate">
                    {v?.type && (<span className="font-semibold mr-1">{v.type}</span>)}
                    {v.vesselName}
                  </span>
                  {v?.personnelCount !== undefined && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({v.personnelCount})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnMapVesselClicked(row.original, v);
                    }}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 group-hover:opacity-100 transition-opacity dark:hover:bg-destructive/40"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </Badge>
              ))}
              {remainingCount > 0 && (
                <button
                  type="button"
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-sm transition-colors duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllVessels(true);
                  }}
                >
                  +{remainingCount} {t($ => $.contractorVessel.more)}
                </button>
              )}
            </div>

            <Dialog open={showAllVessels} onOpenChange={setShowAllVessels}>
              <DialogContent className="max-w-md p-0 gap-0 bg-white dark:bg-gray-900" aria-describedby={undefined}>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="text-lg text-gray-900 dark:text-white">{t($ => $.contractorVessel.assignedVessels)}</DialogTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {vessels.length} {t($ => $.contractorVessel.vessel)}{vessels.length !== 1 ? 's' : ''} {t($ => $.contractorVessel.assignedVessels).toLowerCase()}
                  </p>
                </DialogHeader>
                <Separator />
                <ScrollArea className="max-h-96 p-6 pt-4">
                  <div className="space-y-3">
                    {vessels.map((vessel: any, index: number) => (
                      <div
                        key={vessel.id || index}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate text-gray-900 dark:text-white">{vessel.vesselName}</div>
                          <div className="flex items-center gap-2">
                            {vessel?.type && (
                              <div className="text-xs truncate text-gray-500 dark:text-gray-400">{t($ => $.contractorVessel.type)}: {vessel.type}</div>
                            )}
                            {vessel?.personnelCount !== undefined && (
                              <div className="text-xs truncate text-gray-500 dark:text-gray-400">
                                {vessel.personnelCount} {t($ => $.contractorVessel.personnel)}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                          #{index + 1}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnMapVesselClicked(
                              row.original,
                              vessel
                            );
                            setShowAllVessels(false);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        );
      }
    },
    {
      accessorKey: "action",
      header: ({ column }: any) => {
        return (<div className="text-center">{t($ => $.shared.action)}</div>);
      },
      enableSorting: false,
      size: 80,
      cell: ({ row }: any) => {
        // Local state for dropdown menu
        const [isDropdownOpen, setIsDropdownOpen] = useState(false);

        return (
          <div className="text-center">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size={"icon"} disabled={loading}>
                  <IoMenu />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="bottom" align="start">
                <DropdownMenuGroup>
                  {onEditContractorClicked && (
                    <DropdownMenuItem
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onEditContractorClicked(row.original);
                      }}
                    >
                      <CiEdit /> {t($ => $.contractorVessel.editContractor)}
                    </DropdownMenuItem>
                  )}
                  {onEditMappingClicked && (
                    <DropdownMenuItem
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onEditMappingClicked(row.original);
                      }}
                    >
                      <IoIosGitNetwork /> {t($ => $.contractorVessel.mappingVessel.title)}
                    </DropdownMenuItem>
                  )}
                  <Separator />
                  <DropdownMenuItem
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onDeleteContractor && onDeleteContractor(row.original);
                    }}
                    className={"text-destructive"}
                  >
                    <CiTrash className={"text-destructive"} /> {t($ => $.contractorVessel.deleteContractor)}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    },
  ], [onEditMappingClicked, onUnMapVesselClicked, onDeleteContractor, onEditContractorClicked])

  const { table } = useDataTable({
    data: data || [],
    columns,
    pageCount: -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["action"] },
    },
    manualSorting: false,
    manualPagination: false,
    manualFiltering: false,
  });

  return (
    <div className={"px-4"}>
      {data && <DataTable
        table={table}
        styles={{ container: { default: "border" } }}
      >
        <div className={"flex flex-row gap-2 justify-between"}>
          {toolbarNew}
        </div>
      </DataTable>
      }
    </div>
  );
}

export default TableContractorVessels;