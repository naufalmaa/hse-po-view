import * as React from "react";
import { Badge } from '@/components/ui/badge';
import { Search } from "lucide-react";
import { LuX } from "react-icons/lu";
import { useAppTranslation } from '@/lib/i18n-typed';

interface FilterBadgesProps {
  form: any;
  companiesData: any[];
  onFilterSubmit: (values: any) => void;
  vesselsData?: any[];
  projectsData?: any[];
}

export const FilterBadges: React.FC<FilterBadgesProps> = ({
  form,
  companiesData,
  onFilterSubmit,
  vesselsData = [],
  projectsData = [],
}) => {
  const { t } = useAppTranslation();
  const values = form.watch();

  const search = values.search || "";
  const company = values.company || "all";
  const category = values.category || "all";
  const dateRange = values.dateRange || "all";
  const projectId = values.projectId || "all";
  const vesselId = values.vesselId || "all";

  const hasFilters = search !== "" || company !== "all" || category !== "all" || dateRange !== "all" || projectId !== "all" || vesselId !== "all";

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 px-2 items-center min-h-0 mb-4">
      {category !== "all" && (
        <Badge variant="subtle-primary" className="gap-1.5 px-2 py-1 h-7 rounded-full border-primary/20 shadow-sm transition-all hover:bg-primary/20">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Kategori:</span>
          <span className="font-semibold">{category}</span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              form.setValue("category", "all");
              onFilterSubmit(form.getValues());
            }}
          >
            <LuX className="h-3 w-3" />
          </div>
        </Badge>
      )}

      {company !== "all" && (() => {
        const comp = companiesData?.find((c: any) => String(c.id) === String(company));
        if (!comp) return null;
        return (
          <Badge variant="subtle-secondary" className="gap-1.5 px-2 py-1 h-7 rounded-full border-muted shadow-sm transition-all hover:bg-muted/80">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Perusahaan:</span>
            <span className="font-semibold">{comp.name}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                form.setValue("company", "all");
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })()}

      {projectId !== "all" && (() => {
        const proj = projectsData?.find((p: any) => String(p.value) === String(projectId));
        if (!proj) return null;
        return (
          <Badge variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-purple-200 shadow-sm transition-all hover:bg-purple-100">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Proyek:</span>
            <span className="font-semibold">{proj.label}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                form.setValue("projectId", "all");
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })()}

      {vesselId !== "all" && (() => {
        const ves = vesselsData?.find((v: any) => String(v.id) === String(vesselId));
        if (!ves) return null;
        return (
          <Badge variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-cyan-200 shadow-sm transition-all hover:bg-cyan-100">
            <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Kapal:</span>
            <span className="font-semibold">{ves.name}</span>
            <div
              className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                form.setValue("vesselId", "all");
                onFilterSubmit(form.getValues());
              }}
            >
              <LuX className="h-3 w-3" />
            </div>
          </Badge>
        );
      })()}

      {dateRange !== "all" && (
        <Badge variant="subtle-info" className="gap-1.5 px-2 py-1 h-7 rounded-full border-blue-200 shadow-sm transition-all hover:bg-blue-100">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">Rentang Waktu:</span>
          <span className="font-semibold">
            {dateRange === "custom" && values.date_start && values.date_end
              ? `${new Date(values.date_start).toLocaleDateString()} - ${new Date(values.date_end).toLocaleDateString()}`
              : dateRange === "this-week"
              ? t($ => $.smartCard.filters.thisWeek, "Minggu Ini")
              : dateRange === "this-month"
              ? t($ => $.smartCard.filters.thisMonth, "Bulan Ini")
              : dateRange === "last-month"
              ? t($ => $.smartCard.filters.lastMonth, "Bulan Lalu")
              : dateRange}
          </span>
          <div
            className="p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive cursor-pointer transition-colors pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              form.setValue("dateRange", "all");
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
