import React, { useMemo, useState } from "react";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HelpCircle, Filter, RotateCcw, X } from "lucide-react";
import { CiTrash, CiEdit } from "react-icons/ci";
import { DataTable, DataTableColumnHeader, DataTableFilter, DataTableViewOptions, useDataTable } from "@/components/custom/table";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  data: any[];
  loading: boolean;
  onCreateClicked?: () => void;
  onEditClicked: (item: any) => void;
  onDeleteClicked: (item: any) => void;
  toolbarNew?: React.ReactNode;
}

const TableSubTypes = ({ data, loading, onCreateClicked, onDeleteClicked, onEditClicked, toolbarNew }: Props) => {
  const { t } = useAppTranslation();

  // Filter state
  const [filters, setFilters] = useState({
    hoursPheMin: "",
    hoursPheMax: "",
    hoursContractorMin: "",
    hoursContractorMax: "",
    targetMin: "",
    targetMax: "",
    autoCalculate: "all", // "all" | "on" | "off"
  });
  const [openFilter, setOpenFilter] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.hoursPheMin !== "" || filters.hoursPheMax !== "") count++;
    if (filters.hoursContractorMin !== "" || filters.hoursContractorMax !== "") count++;
    if (filters.targetMin !== "" || filters.targetMax !== "") count++;
    if (filters.autoCalculate !== "all") count++;
    return count;
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      hoursPheMin: "",
      hoursPheMax: "",
      hoursContractorMin: "",
      hoursContractorMax: "",
      targetMin: "",
      targetMax: "",
      autoCalculate: "all",
    });
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((item: any) => {
      const extra = item.extra || {};
      const hoursPhe = extra.hoursPobPheOses != null ? Number(extra.hoursPobPheOses) : null;
      const hoursContractor = extra.hoursPobContractor != null ? Number(extra.hoursPobContractor) : null;
      const target = extra.target != null ? Number(extra.target) : null;
      const isAuto = extra.autoCalculateManhours !== false;

      // Filter Hours POB PHE OSES
      if (filters.hoursPheMin !== "") {
        if (hoursPhe == null || hoursPhe < Number(filters.hoursPheMin)) return false;
      }
      if (filters.hoursPheMax !== "") {
        if (hoursPhe == null || hoursPhe > Number(filters.hoursPheMax)) return false;
      }

      // Filter Hours POB Contractor
      if (filters.hoursContractorMin !== "") {
        if (hoursContractor == null || hoursContractor < Number(filters.hoursContractorMin)) return false;
      }
      if (filters.hoursContractorMax !== "") {
        if (hoursContractor == null || hoursContractor > Number(filters.hoursContractorMax)) return false;
      }

      // Filter Target
      if (filters.targetMin !== "") {
        if (target == null || target < Number(filters.targetMin)) return false;
      }
      if (filters.targetMax !== "") {
        if (target == null || target > Number(filters.targetMax)) return false;
      }

      // Filter Trigger Otomatis Manhours
      if (filters.autoCalculate === "on" && !isAuto) return false;
      if (filters.autoCalculate === "off" && isAuto) return false;

      return true;
    });
  }, [data, filters]);

  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum" }),
    {
      accessorKey: "name",
      meta: {
        label: t($ => $.subTypes.name)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.subTypes.name)} />)
      },
      enableSorting: true,
      size: 200
    },
    {
      accessorKey: "extra.hoursPobPheOses",
      meta: {
        label: t($ => $.subTypes.hoursPobPheOses)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.subTypes.hoursPobPheOses)} />)
      },
      enableSorting: true,
      size: 150
    },
    {
      accessorKey: "extra.hoursPobContractor",
      meta: {
        label: t($ => $.subTypes.hoursPobContractor)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.subTypes.hoursPobContractor)} />)
      },
      enableSorting: true,
      size: 150
    },
    {
      accessorKey: "extra.target",
      meta: {
        label: t($ => $.subTypes.target) || "Target"
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.subTypes.target) || "Target"} />)
      },
      enableSorting: true,
      size: 120
    },
    {
      accessorKey: "workLocations",
      meta: {
        label: t($ => $.subTypes.workLocations) || "Lokasi Kerja"
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.subTypes.workLocations) || "Lokasi Kerja"} />)
      },
      enableSorting: false,
      size: 200,
      cell: ({ row }: any) => {
        const locations = row.original?.workLocations || [];
        if (locations.length === 0) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {locations.map((loc: any, i: number) => (
              <Badge key={loc.id || i} variant="secondary" className="text-[11px] font-normal py-0 px-1.5">
                {loc.name}
              </Badge>
            ))}
          </div>
        );
      }
    },
    {
      accessorKey: "extra.autoCalculateManhours",
      meta: {
        label: t($ => $.subTypes.autoCalculateManhours) || "Trigger Otomatis Manhours"
      },
      header: ({ column }: any) => {
        return (
          <div className="flex items-center gap-1">
            <DataTableColumnHeader column={column} title={t($ => $.subTypes.autoCalculateManhours) || "Trigger Otomatis"} />
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex text-muted-foreground hover:text-primary transition-colors">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {t($ => $.subTypes.autoCalculateTooltip) || "Set ON apabila project terus berjalan dan OFF apabila project telah selesai"}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
      enableSorting: true,
      size: 160,
      cell: ({ row }: any) => {
        const isAuto = row.original?.extra?.autoCalculateManhours !== false;
        return isAuto ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">
            ON (Aktif)
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-[11px]">
            OFF (Selesai)
          </Badge>
        );
      }
    },
    {
      accessorKey: "action",
      size: 80,
      minSize: 80,
      enableSorting: false,
      meta: {
        label: t($ => $.shared.action)
      },
      header: ({ column }: any) => {
        return (<DataTableColumnHeader column={column} title={t($ => $.shared.action)} className={"justify-center"} />)
      },
      cell: ({ row }: any) => {
        return (
          <div className="text-center">
            <Button variant="ghost" size={"icon"} disabled={loading} onClick={() => onEditClicked(row.original)}><CiEdit /></Button>
            <Button variant="ghost" size={"icon"} disabled={loading} onClick={() => onDeleteClicked(row.original)}
              className={"text-destructive"}><CiTrash /></Button>
          </div>
        );
      }
    },
  ], []);

  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount: -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["action"] },
      pagination: { pageIndex: 0, pageSize: 10 },
    },
    manualSorting: false,
    manualPagination: false,
    manualFiltering: false,
  });

  return (
    <div className={"px-4 space-y-3"}>
      {data && (
        <DataTable
          table={table}
          styles={{container: {default: "border"}}}
        >
          <div className={"flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center"}>
            <div className={"flex flex-wrap items-center gap-2"}>
              <DataTableFilter table={table} searchColumnIds={[]} searchPlaceholder={t($ => $.shared.searchPlaceholder) || "Cari..."} />
              <DataTableViewOptions table={table} />

              {/* Filter Popover */}
              <Popover open={openFilter} onOpenChange={setOpenFilter}>
                <PopoverTrigger asChild>
                  <Button
                    variant={activeFiltersCount > 0 ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 border-dashed flex items-center gap-1.5",
                      activeFiltersCount > 0 && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filter</span>
                    {activeFiltersCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 rounded-sm px-1.5 py-0 font-mono text-[10px] bg-primary-foreground text-primary"
                      >
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-88 p-4 shadow-xl border border-border" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                        <Filter className="h-3.5 w-3.5 text-primary" />
                        <span>Filter Parameter Proyek</span>
                      </div>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetFilters}
                          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>

                    {/* Range Hours POB PHE OSES */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Hours POB PHE OSES (Range)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.hoursPheMin}
                          onChange={(e) => setFilters(prev => ({ ...prev, hoursPheMin: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.hoursPheMax}
                          onChange={(e) => setFilters(prev => ({ ...prev, hoursPheMax: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Range Hours POB Contractor */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Hours POB Contractor (Range)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.hoursContractorMin}
                          onChange={(e) => setFilters(prev => ({ ...prev, hoursContractorMin: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.hoursContractorMax}
                          onChange={(e) => setFilters(prev => ({ ...prev, hoursContractorMax: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Range Target */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Target (Range)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.targetMin}
                          onChange={(e) => setFilters(prev => ({ ...prev, targetMin: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.targetMax}
                          onChange={(e) => setFilters(prev => ({ ...prev, targetMax: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Trigger Otomatis Manhours */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Trigger Otomatis Manhours</label>
                      <Select
                        value={filters.autoCalculate}
                        onValueChange={(val) => setFilters(prev => ({ ...prev, autoCalculate: val }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                          <SelectItem value="on" className="text-xs">ON (Aktif)</SelectItem>
                          <SelectItem value="off" className="text-xs">OFF (Selesai)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        Ditemukan: <strong>{filteredData.length}</strong> / {data?.length || 0}
                      </span>
                      <Button size="sm" className="h-7 text-xs px-3" onClick={() => setOpenFilter(false)}>
                        Selesai
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Active filter reset button if any filter is active */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset Filter ({activeFiltersCount})</span>
                </Button>
              )}
            </div>
            {toolbarNew}
          </div>
        </DataTable>
      )}
    </div>
  );
}

export default TableSubTypes;