import * as React from "react";
import { Badge } from '@/components/ui/badge';
import { Search, Calendar } from "lucide-react";
import { LuX } from "react-icons/lu";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { defaultStore } from '@/stores/useAppStore';
import { useAppTranslation } from '@/lib/i18n-typed';
import { format } from "date-fns";

interface FilterBadgesProps {
  form: any;
  projectIdList: any[];
  vesselList: any[];
  contractorList: any[];
  onFilterSubmit: (values: any) => void;
  setSearchValue: (value: string) => void;
}

const FilterBadges: React.FC<FilterBadgesProps> = ({
  form,
  projectIdList,
  vesselList,
  contractorList,
  onFilterSubmit,
  setSearchValue,
}) => {
  const { t } = useAppTranslation();

  return (
    <div className="flex flex-wrap gap-2 px-2 items-center min-h-0">
      {form.watch("category")?.map((val: string) => {
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

      {form.watch("projectId")?.map((val: string) => {
        const option = projectIdList?.find((o: any) => o.value === val);
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

      {form.watch("vesselId")?.map((val: string) => {
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

      {form.watch("subContractorId")?.map((val: string) => {
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

      {form.watch("status")?.map((val: string) => (
        <Badge key={`status-${val}`} variant="subtle-success" className="gap-1.5 px-2 py-1 h-7 rounded-full border-green-200 shadow-sm transition-all hover:bg-green-100">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Status:</span>
          <span className="font-semibold">
            {val === "on_duty" ? t($ => $.attendanceList.attendanceList.status.onDuty) : t($ => $.attendanceList.attendanceList.status.offDuty)}
          </span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              const newVal = form.getValues("status").filter((v: any) => v !== val);
              form.setValue("status", newVal);
              onFilterSubmit(form.getValues());
            }}
          >
            <LuX className="h-3 w-3" />
          </div>
        </Badge>
      ))}

      {form.watch("location")?.map((val: string) => (
        <Badge key={`location-${val}`} variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-blue-200 shadow-sm transition-all hover:bg-blue-100">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Lokasi:</span>
          <span className="font-semibold">{val}</span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              const newVal = form.getValues("location").filter((v: any) => v !== val);
              form.setValue("location", newVal);
              onFilterSubmit(form.getValues());
            }}
          >
            <LuX className="h-3 w-3" />
          </div>
        </Badge>
      ))}

      {(form.watch("selectByRange") === "true" || form.watch("selectByRange") === true) && (
        <Badge variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-blue-200 shadow-sm transition-all hover:bg-blue-100">
          <Calendar className="h-3 w-3 opacity-60" />
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Rentang:</span>
          <span className="font-semibold">
            {format(form.watch("date_start"), "dd MMM yyyy")} - {format(form.watch("date_end"), "dd MMM yyyy")}
          </span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              form.setValue("selectByRange", "false");
              onFilterSubmit(form.getValues());
            }}
          >
            <LuX className="h-3 w-3" />
          </div>
        </Badge>
      )}

      {form.watch("search") && (
        <Badge variant="outline" className="gap-1.5 px-2 py-1 h-7 rounded-full border-primary/30 bg-primary/5 text-primary shadow-sm">
          <Search className="h-3 w-3 opacity-60" />
          <span className="font-semibold">{form.watch("search")}</span>
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
