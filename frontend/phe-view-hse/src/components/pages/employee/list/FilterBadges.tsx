import * as React from "react";
import { Badge } from '@/components/ui/badge';
import { Search } from "lucide-react";
import { LuX } from "react-icons/lu";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { defaultStore, useAppStore } from '@/stores/useAppStore';
import { useAppTranslation } from '@/lib/i18n-typed';

interface FilterBadgesProps {
  form: any;
  subTypes: any[];
  vesselList: any[];
  contractorList: any[];
  locationList?: any[];
  onFilterSubmit: (values: any) => void;
  setSearchValue: (value: string) => void;
  searchParams: any;
}

const FilterBadges: React.FC<FilterBadgesProps> = ({
  form,
  subTypes,
  vesselList,
  contractorList,
  locationList,
  onFilterSubmit,
  setSearchValue,
  searchParams,
}) => {
  const { t } = useAppTranslation();
  const store = useAppStore();
  const initialFilter = store?.employeeList ?? defaultStore.employeeList;

  const parseParam = (param: any) => {
    if (Array.isArray(param)) return param;
    if (typeof param === 'string' && param.trim() !== '') {
      return param.includes(',') ? param.split(',') : [param];
    }
    return undefined;
  };

  const categories = parseParam(searchParams.category) || initialFilter.category || [];
  const projectIds = parseParam(searchParams.projectId) || initialFilter.projectId || [];
  const vesselIds = parseParam(searchParams.vesselId) || initialFilter.vesselId || [];
  const locations = parseParam(searchParams.location) || initialFilter.location || [];
  const statusOnDuty = parseParam(searchParams.statusOnDuty)?.map((v: any) => v === 'true' || v === true) || initialFilter.statusOnDuty || [];
  const ohihReviews = parseParam(searchParams.ohihReview) || initialFilter.ohihReview || [];
  const subContractorIds = parseParam(searchParams.subContractorId) || initialFilter.subContractorId || [];
  const docKeys = parseParam(searchParams.complianceDocKey) || initialFilter.complianceDocKey || [];
  const documentStatus = searchParams.documentStatus || initialFilter.documentStatus || "";
  const search = searchParams.search || initialFilter.search || "";
  const sortBy = searchParams.sortBy || initialFilter.sortBy;
  const orderBy = searchParams.orderBy || initialFilter.orderBy;

  return (
    <div className="flex flex-wrap gap-2 px-2 items-center min-h-0">
      {categories.map((val: string) => {
        const option = Object.values(EMPLOYEE_TYPE).find(o => o.value === val);
        if (!option) return null;
        return (
          <Badge key={`category-${val}`} variant="subtle-primary" className="gap-1.5 px-2 py-1 h-7 rounded-full border-primary/20 shadow-sm transition-all hover:bg-primary/20">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Kategori:</span>
            <span className="font-semibold">{option.label}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                const newVal = form.getValues("category").filter((v: any) => v !== val);
                form.setValue("category", newVal);
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })}

      {projectIds.map((val: string) => {
        const option = subTypes?.find((o: any) => o.value === val);
        if (!option) return null;
        return (
          <Badge key={`project-${val}`} variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-blue-200 shadow-sm transition-all hover:bg-blue-100">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Proyek:</span>
            <span className="font-semibold">{option.label}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                const newVal = form.getValues("projectId").filter((v: any) => v !== val);
                form.setValue("projectId", newVal);
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })}

      {vesselIds.map((val: string) => {
        const option = vesselList?.find((o: any) => o.value === val);
        if (!option) return null;
        return (
          <Badge key={`vessel-${val}`} variant="subtle-purple" className="gap-1.5 px-2 py-1 h-7 rounded-full border-purple-200 shadow-sm transition-all hover:bg-purple-100">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Kapal:</span>
            <span className="font-semibold">{option.label}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                const newVal = form.getValues("vesselId").filter((v: any) => v !== val);
                form.setValue("vesselId", newVal);
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })}

      {locations.map((val: string) => {
        const option = locationList?.find((o: any) => o.value === val);
        const label = option?.label || val;
        return (
          <Badge key={`location-${val}`} variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-teal-200 shadow-sm transition-all hover:bg-teal-100">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Lokasi:</span>
            <span className="font-semibold">{label}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                const newVal = (form.getValues("location") || []).filter((v: any) => v !== val);
                form.setValue("location", newVal);
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })}

      {statusOnDuty.map((val: any) => {
        const isTrue = val === 'true' || val === true;
        return (
          <Badge key={`status-${val}`} variant="subtle-success" className="gap-1.5 px-2 py-1 h-7 rounded-full border-green-200 shadow-sm transition-all hover:bg-green-100">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Status:</span>
            <span className="font-semibold">{isTrue ? t($ => $.employeeList.filterOptions.onDuty) : t($ => $.employeeList.filterOptions.offDuty)}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                const newVal = form.getValues("statusOnDuty").filter((v: any) => (v === 'true' || v === true) !== isTrue);
                form.setValue("statusOnDuty", newVal);
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })}

      {ohihReviews.map((val: string) => (
        <Badge key={`ohih-${val}`} variant="subtle-warning" className="gap-1.5 px-2 py-1 h-7 rounded-full border-amber-200 shadow-sm transition-all hover:bg-amber-100">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Risiko:</span>
          <span className="font-semibold">{val}</span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              const newVal = form.getValues("ohihReview").filter((v: any) => v !== val);
              form.setValue("ohihReview", newVal);
              onFilterSubmit(form.getValues());
            }}
          >
            <LuX className="h-3 w-3" />
          </div>
        </Badge>
      ))}

      {subContractorIds.map((val: string) => {
        const option = contractorList?.find((o: any) => o.value === val);
        if (!option) return null;
        return (
          <Badge key={`subcon-${val}`} variant="subtle-secondary" className="gap-1.5 px-2 py-1 h-7 rounded-full border-muted shadow-sm transition-all hover:bg-muted/80">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Kontraktor:</span>
            <span className="font-semibold">{option.label}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                const newVal = form.getValues("subContractorId").filter((v: any) => v !== val);
                form.setValue("subContractorId", newVal);
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })}

      {(() => {
        if (docKeys.length === 8) {
          return (
            <Badge variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-blue-200 shadow-sm transition-all hover:bg-blue-100">
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Dokumen:</span>
              <span className="font-semibold">Semua Dokumen</span>
              <div
                className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  form.setValue("complianceDocKey", undefined as any);
                  onFilterSubmit(form.getValues());
                }}
              >
                <LuX className="h-3 w-3" />
              </div>
            </Badge>
          );
        }

        return docKeys.map((key: string) => (
          <Badge key={`doc-${key}`} variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-blue-200 shadow-sm transition-all hover:bg-blue-100">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Dokumen:</span>
            <span className="font-semibold">{key}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                const newVal = docKeys.filter((v: string) => v !== key);
                form.setValue("complianceDocKey", newVal.length > 0 ? newVal : undefined as any);
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        ));
      })()}

      {(sortBy || orderBy) && (
        <Badge variant="subtle-secondary" className="gap-1.5 px-2 py-1 h-7 rounded-full border-border shadow-sm">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Urutan:</span>
          <span className="font-semibold">
            {(() => {
              const sortOpt = [
                { value: "category", label: t($ => $.employeeList.filterOptions.category) },
                { value: "employeeName", label: t($ => $.employeeList.filterOptions.employeeName) },
                { value: "position", label: t($ => $.employeeList.filterOptions.position) },
                { value: "statusOnDuty", label: t($ => $.employeeList.filterOptions.statusOnDuty) },
                { value: "createdAt", label: t($ => $.employeeList.filterOptions.createdAt) },
                { value: "updatedAt", label: t($ => $.employeeList.filterOptions.updatedAt) },
              ].find(o => o.value === sortBy);
              const order = orderBy === 'asc' ? 'Naik' : 'Turun';
              return `${sortOpt?.label || sortBy} (${order})`;
            })()}
          </span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              form.setValue("sortBy", defaultStore.employeeList.sortBy);
              form.setValue("orderBy", defaultStore.employeeList.orderBy);
              onFilterSubmit(form.getValues());
            }}
          >
            <LuX className="h-3 w-3" />
          </div>
        </Badge>
      )}

      {documentStatus && (
        <Badge variant="subtle-secondary" className="gap-1.5 px-2 py-1 h-7 rounded-full border-gray-200 shadow-sm transition-all hover:bg-gray-100">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Stat Dok:</span>
          <span className="font-semibold">{documentStatus}</span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              form.setValue("documentStatus", "");
              onFilterSubmit(form.getValues());
            }}
          >
            <LuX className="h-3 w-3" />
          </div>
        </Badge>
      )}

      {search && (
        <Badge variant="outline" className="gap-1.5 px-2 py-1 h-7 rounded-full border-primary/30 bg-primary/5 text-primary shadow-sm">
          <Search className="h-3 w-3 opacity-60" />
          <span className="font-semibold">{search}</span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              setSearchValue('');
              form.setValue('search', '');
              onFilterSubmit(form.getValues());
            }}
          >
            <LuX className="h-3 w-3" />
          </div>
        </Badge>
      )}
    </div>
  );
};

export default FilterBadges;
