import * as React from "react";
import { Button } from '@/components/ui/button';
import { LuFileSpreadsheet } from "react-icons/lu";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppTranslation } from '@/lib/i18n-typed';
import { AppRoute } from "@/constants/app-route";

interface FilterComplianceProps {
  searchParams: any;
  navigate: any;
}

const FilterCompliance: React.FC<FilterComplianceProps> = ({
  searchParams,
  navigate,
}) => {
  const { t } = useAppTranslation();

  if (!searchParams.complianceDocKey) return null;

  return (
    <div className="flex flex-col gap-4 mb-6 p-6 bg-card rounded-2xl border border-border shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <LuFileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {t($ => $.employee.dashboard.charts.complianceRatePerDocument)}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Pilih kategori dokumen di bawah ini</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-dashed transition-colors"
            onClick={() => {
              navigate({
                to: AppRoute.employee.list.url,
                search: (prev: any) => ({ ...prev, complianceDocKey: undefined, documentStatus: undefined })
              });
            }}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            {t($ => $.shared.clear)}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {[
            { key: 'BPJS', label: 'BPJS' },
            { key: 'Contract', label: 'Contract' },
            { key: 'Vaccine', label: 'Vaccine' },
            { key: 'SIKA', label: 'SIKA' },
            { key: 'MCU', label: 'MCU' },
            { key: 'BSS', label: 'BSS' },
            { key: 'BST', label: 'BST' },
            { key: 'Competency Certificate', label: 'Sertifikat Kompetensi' },
          ].map((opt) => {
            const currentKeys: string[] = Array.isArray(searchParams.complianceDocKey)
              ? searchParams.complianceDocKey
              : (searchParams.complianceDocKey ? [searchParams.complianceDocKey as string] : []);
            const isActive = currentKeys.includes(opt.key);

            return (
              <Button
                key={opt.key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 px-5 text-xs font-semibold transition-all rounded-lg",
                  isActive
                    ? "shadow-md ring-2 ring-primary/20 ring-offset-2"
                    : "bg-background hover:bg-accent/50 hover:border-primary/40 border-border/80"
                )}
                onClick={() => {
                  let nextKeys: string[] = [];
                  if (isActive) {
                    nextKeys = currentKeys.filter((k: string) => k !== opt.key);
                  } else {
                    nextKeys = [...currentKeys, opt.key];
                  }
                  navigate({
                    to: AppRoute.employee.list.url,
                    search: (prev: any) => ({
                      ...prev,
                      complianceDocKey: nextKeys.length > 0 ? nextKeys : undefined,
                      documentStatus: undefined
                    })
                  });
                }}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2 ml-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Filter Status:</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {(() => {
              const keys: string[] = Array.isArray(searchParams.complianceDocKey)
                ? searchParams.complianceDocKey
                : (searchParams.complianceDocKey ? [searchParams.complianceDocKey as string] : []);
              if (keys.length === 8) return 'Semua Dokumen';
              if (keys.length === 0) return 'Tidak ada dokumen dipilih';
              return keys.join(', ');
            })()}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl w-fit border border-border shadow-sm">
          <Button
            variant={!searchParams.documentStatus ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-5 text-[11px] font-bold transition-all rounded-lg",
              !searchParams.documentStatus ? "shadow-sm" : "bg-background border-transparent hover:border-border"
            )}
            onClick={() => navigate({ to: AppRoute.employee.list.url, search: (prev: any) => ({ ...prev, documentStatus: undefined }) })}
          >
            {t($ => $.shared.all)}
          </Button>
          <Button
            variant={searchParams.documentStatus === 'empty' ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-5 text-[11px] font-bold transition-all rounded-lg",
              searchParams.documentStatus === 'empty' ? "shadow-sm" : "bg-background border-transparent hover:border-border"
            )}
            onClick={() => navigate({ to: AppRoute.employee.list.url, search: (prev: any) => ({ ...prev, documentStatus: 'empty' }) })}
          >
            {t($ => $.shared.emptyDocument)}
          </Button>

          {(() => {
            const keys: string[] = Array.isArray(searchParams.complianceDocKey)
              ? searchParams.complianceDocKey
              : (searchParams.complianceDocKey ? [searchParams.complianceDocKey as string] : []);
            const hasFilledType = keys.some((k: string) => ['BPJS', 'Vaccine'].includes(k));
            return hasFilledType && (
              <Button
                variant={searchParams.documentStatus === 'filled' ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 px-5 text-[11px] font-bold transition-all rounded-lg",
                  searchParams.documentStatus === 'filled' ? "shadow-sm" : "bg-background border-transparent hover:border-border"
                )}
                onClick={() => navigate({ to: AppRoute.employee.list.url, search: (prev: any) => ({ ...prev, documentStatus: 'filled' }) })}
              >
                {t($ => $.shared.filled)}
              </Button>
            );
          })()}

          {(() => {
            const keys: string[] = Array.isArray(searchParams.complianceDocKey)
              ? searchParams.complianceDocKey
              : (searchParams.complianceDocKey ? [searchParams.complianceDocKey as string] : []);
            const hasExpiryType = keys.some((k: string) => !['BPJS', 'Vaccine'].includes(k));
            return hasExpiryType && (
              <>
                <Button
                  variant={searchParams.documentStatus === 'expired' ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 px-5 text-[11px] font-bold transition-all rounded-lg",
                    searchParams.documentStatus === 'expired' ? "shadow-sm" : "bg-background border-transparent hover:border-border"
                  )}
                  onClick={() => navigate({ to: AppRoute.employee.list.url, search: (prev: any) => ({ ...prev, documentStatus: 'expired' }) })}
                >
                  {t($ => $.shared.expired)}
                </Button>
                <Button
                  variant={searchParams.documentStatus === 'near_expiry' ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 px-5 text-[11px] font-bold transition-all rounded-lg",
                    searchParams.documentStatus === 'near_expiry' ? "shadow-sm" : "bg-background border-transparent hover:border-border"
                  )}
                  onClick={() => navigate({ to: AppRoute.employee.list.url, search: (prev: any) => ({ ...prev, documentStatus: 'near_expiry' }) })}
                >
                  {t($ => $.shared.expireSoon)}
                </Button>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default FilterCompliance;
