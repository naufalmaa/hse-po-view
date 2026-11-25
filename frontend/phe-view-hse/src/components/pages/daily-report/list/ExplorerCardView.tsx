import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileImage, Calendar, User, Building, MoreVertical, Edit, Trash2, Copy } from 'lucide-react';
import { string_date_formatted } from "@/lib/my-utils";
import { DataTablePagination } from "@/components/custom/table";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useState } from "react";

type Props = {
  data: Record<string, any>,
  onEditClicked: (item: any) => void,
  onDeleteClicked: (item: any) => void,
  onDuplicateClicked?: (item: any) => void,
  onPageSizeChange: (rowSize: any, pageIndex: any) => void
}

const ExplorerCardView = ({ data, onEditClicked, onDeleteClicked, onDuplicateClicked, onPageSizeChange }: Props) => {
  const { t } = useAppTranslation();

  // State to control dropdown menu visibility per card
  const [openDropdownCardId, setOpenDropdownCardId] = useState<string | null>(null);

  type FormType = 'project' | 'marine';
  const getFormTypeColor = (formType: FormType) => {
    const colors: Record<FormType, string> = {
      project: 'bg-blue-200 border-blue-500',
      marine: 'bg-green-200 border-green-500',
    };
    return colors[formType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-0">
      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {data?.data?.map((item: any) => (
          <Card
            key={item.id}
            className="py-0 group hover:shadow-lg transition-all duration-200 cursor-pointer border hover:border-secondary bg-card"
          >
            <CardContent className="p-0">
              {/* Thumbnail */}
              <div className="relative overflow-hidden rounded-t-lg">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.subtypeName}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      // e.target.style.display = 'none';
                      // e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${item.imageUrl ? 'hidden' : 'flex'
                    }`}
                >
                  <FileImage className="w-12 h-12 text-gray-400" />
                </div>

                {/* Form Type Badge */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFormTypeColor(item.formType)}`}>
                    {item.formType}
                  </span>
                </div>

                {/* Menu Button */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <DropdownMenu open={openDropdownCardId === item.id} onOpenChange={(isOpen) => {
                    if (isOpen) {
                      setOpenDropdownCardId(item.id);
                    } else {
                      setOpenDropdownCardId(null);
                    }
                  }}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-8 h-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-32">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownCardId(null);
                          onEditClicked(item?.id);
                        }}
                        className="cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t($ => $.dailyReport.card.edit)}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownCardId(null);
                          onDuplicateClicked && onDuplicateClicked(item);
                        }}
                        className="cursor-pointer text-blue-600 focus:text-blue-600"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplikat
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownCardId(null);
                          onDeleteClicked(item);
                        }}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t($ => $.dailyReport.card.delete)}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-3 space-y-2">

                {/* Title */}
                <h3 className="font-semibold text-sm truncate hover:text-primary">
                  <div onClick={() => onEditClicked(item?.id)}>
                    {string_date_formatted({ localeId: "id-ID", dateString: item.reportDate, format: "MMMM dd, yyyy" })}
                  </div>
                </h3>

                {/* Institution */}
                <div className="flex items-center text-xs text-muted-foreground">
                  <Building className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate" title={item.instansi}>{item.instansi}</span>
                </div>

                {/* Reported By */}
                <div className="flex items-center text-xs text-muted-foreground">
                  <User className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate" title={item.reportedBy}>{item.reportedBy}</span>
                </div>

                {/* subtype */}
                <div className="flex items-center text-xs text-muted-foreground gap-1.5 flex-wrap">
                  <span className="font-medium">{item.formType === 'project' ? item.subtypeName : item.vesselName}</span>
                  {item.workLocationName && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.workLocationName}
                    </span>
                  )}
                </div>

                {/* Date */}
                {/*<div className="flex items-center text-xs text-gray-500">*/}
                {/*  <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />*/}
                {/*  <span>{string_to_date_yyyyMMMMdd("id-ID", item.reportDate)}</span>*/}
                {/*</div>*/}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between px-4">
        <div></div>
        <div>
          <DataTablePagination
            pageIndex={data?.meta?.page ?? 0} // Convert 1-based to 0-based
            setPageIndex={(newPageIndex) => onPageSizeChange(data?.meta?.view, newPageIndex)} // Convert 0-based to 1-based
            pageSize={data?.meta?.view ?? 5}
            setPageSize={() => { }} // Not used since we're using paginationData
            rowsCount={data?.meta?.view ?? 5}
            paginationData={{
              page: (data?.meta?.page ?? 0) + 1,
              limit: data?.meta?.view ?? 5,
              total: data?.meta?.total ?? 0,
              totalPages: data?.meta?.totalPages ?? 0
            }}
            showPageSize={false}
            // disabled={false}
            onPaginationChange={(paginationData) => {
              onPageSizeChange(paginationData.limit, paginationData.page - 1)
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ExplorerCardView;