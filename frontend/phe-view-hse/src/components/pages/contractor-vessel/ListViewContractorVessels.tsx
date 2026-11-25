import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CiTrash } from "react-icons/ci";
import { useAppTranslation } from "@/lib/i18n-typed";
import { DataTablePagination } from "@/components/custom/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LuSailboat } from "react-icons/lu";

type Props = {
  data: any[];
  loading?: boolean;
  onDeleteClicked?: (item: any, vessel: any) => void;
  toolbarNew?: React.ReactNode;
  onPaginationChange?: (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => void;
  paginationData: {
    page: number; // Current page (1-based)
    limit: number; // Page size
    total: number; // Total row count
    totalPages: number; // Total pages
  };
}

const ListViewContractorVessels = ({
  data,
  loading,
  onDeleteClicked,
  toolbarNew,
  onPaginationChange,
  paginationData
}: Props) => {
  const { t } = useAppTranslation();
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="px-4 overflow-hidden">
      <div className="flex flex-col gap-2">
        {/* Toolbar */}
        <div className="flex flex-row gap-2 justify-end p-0 bg-card/50">
          <div className="flex flex-row gap-2">
            {toolbarNew}
          </div>
        </div>

        {/* Contractor Vessels List */}
        <div className="border border-border rounded-lg overflow-hidden">
          {data && data.length > 0 ? (
            data.map((item, index) => {
              const contractor = item;
              const vessels = item.vessels || [];
              const isExpanded = expandedItems[item.id] || false;

              return (
                <div
                  key={item.id || index}
                  className="flex flex-col border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4">
                    <div className="flex-1 mb-3 md:mb-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-medium text-foreground">
                          {contractor?.name || '-'}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-primary/10 rounded-full">
                            <LuSailboat className="h-3 w-3 text-primary" />
                          </div>
                          <span>
                            {vessels.length} {vessels.length === 1 ? t($ => $.contractorVessel.vessel) : t($ => $.contractorVessel.vessels)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vessels List */}
                  <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {vessels.slice(0, isExpanded ? vessels.length : 8).map((vessel: any, vesselIndex: number) => (
                        <Badge
                          key={vessel.id || vesselIndex}
                          variant="secondary"
                          className="rounded-sm px-2 py-1 text-xs font-normal flex items-center gap-1 group bg-secondary text-secondary-foreground dark:bg-gray-700 dark:text-gray-200"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{vessel.vesselName}</span>
                            <div className="flex gap-2 mt-1">
                              {vessel.type && (
                                <span className="text-xs opacity-75">
                                  {vessel.type}
                                </span>
                              )}
                              {vessel.personnelCount && (
                                <span className="text-xs opacity-75">
                                  {vessel.personnelCount} {t($ => $.contractorVessel.personnel)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClicked?.(contractor, vessel);
                            }}
                            className="ml-2 h-6 w-6 hover:bg-destructive/20 group-hover:opacity-100 transition-opacity dark:hover:bg-destructive/40 self-center"
                          >
                            <CiTrash className="h-4 w-4 text-destructive" />
                          </Button>
                        </Badge>
                      ))}

                      {vessels.length === 0 && (
                        <div className="text-muted-foreground italic">
                          {t($ => $.contractorVessel.noVesselsAssigned)}
                        </div>
                      )}

                      {/* Show More Button on the same row as vessels */}
                      {vessels.length > 8 && !isExpanded && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpanded(item.id)}
                          className="self-center"
                        >
                          {t($ => $.contractorVessel.showMore)}
                        </Button>
                      )}

                      {/* Show Less Button when expanded */}
                      {vessels.length > 8 && isExpanded && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpanded(item.id)}
                          className="self-center"
                        >
                          {t($ => $.contractorVessel.showLess)}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <LuSailboat className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t($ => $.contractorVessel.noDataFound)}</h3>
              <p className="text-muted-foreground">{t($ => $.contractorVessel.noDataFoundDescription)}</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {paginationData.totalPages > 1 && (
          <div className="border-t border-border p-2">
            <DataTablePagination
              showPageSize={true}
              pageIndex={paginationData.page - 1} // Convert to 0-based index
              setPageIndex={(pageIndex) => {
                if (onPaginationChange) {
                  onPaginationChange({
                    page: pageIndex + 1, // Convert back to 1-based index
                    limit: paginationData.limit,
                    total: paginationData.total,
                    totalPages: paginationData.totalPages,
                  });
                }
              }}
              pageSize={paginationData.limit}
              setPageSize={(pageSize) => {
                if (onPaginationChange) {
                  onPaginationChange({
                    page: 1, // Reset to first page
                    limit: pageSize,
                    total: paginationData.total,
                    totalPages: paginationData.totalPages,
                  });
                }
              }}
              rowsCount={paginationData.total}
              paginationData={paginationData}
              onPaginationChange={onPaginationChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ListViewContractorVessels;