import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAppTranslation } from "@/lib/i18n-typed";
import { DialogModalForm, ModalFormProps, LongText } from "@/components/custom/components";
import { AssetListView } from "@/components/pages/daily-report/create";
import { date_to_string, isDateExpired } from "@/lib/my-utils";
import FormMcu from "./FormMcu";
import { onMcuDataCreated, onMcuDataUpdated } from "./template/mcu";
import { cn } from "@/lib/utils";
import { Mcu } from "@/service/employee/employee-details";
import {
  FileText,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Stethoscope,
  Calendar,
  Hospital
} from "lucide-react";

type Props = {
  employeeId: string;
  formKey: string;
  data: Mcu[];
  onCreateClicked?: any;
  onUpdateClicked?: any;
  onDeleteClicked: (body: any) => void;
  disableAction?: boolean,
  rowId?: string,
  onDeleteAssets?: (item: any[]) => void,
  supportingFiles?: any[]
}

const TableMcu = ({
  employeeId,
  formKey,
  data,
  onCreateClicked,
  onUpdateClicked,
  onDeleteClicked,
  disableAction = false,
  onDeleteAssets,
  supportingFiles,
  rowId = "mcuId",
  ...props
}: Props) => {
  const { t } = useAppTranslation();
  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const getMcuDetails = (item: any) => {
    const mcuExpiredDate = item?.mcuExpiredDate ? new Date(item.mcuExpiredDate) : null;
    // MCU is considered expired if the expired date has passed
    const isExpired = mcuExpiredDate ? isDateExpired(mcuExpiredDate) : true;

    return {
      isExpired,
      // Design tokens
      borderClass: isExpired
        ? "hover:border-red-200 dark:hover:border-red-800"
        : "hover:border-emerald-200 dark:hover:border-emerald-800",
      iconColor: isExpired ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
      iconBg: isExpired ? "bg-red-100/50 dark:bg-red-900/30" : "bg-emerald-100/50 dark:bg-emerald-900/30",
      Icon: Stethoscope
    };
  };

  const getItemSupportingFiles = (itemId: string) => {
    return supportingFiles?.filter((file: any) => file?.[rowId] === itemId) ?? [];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Stethoscope className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t($ => $.employee.mcu.title)}</h3>
          </div>
          <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-5 justify-center">
            {data?.length || 0}
          </Badge>
        </div>

        {!disableAction && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMcuDataCreated(t, employeeId, setConfirmationCreate, onCreateClicked, <FormMcu />)}
            className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/5"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t($ => $.employee.mcu.add)}
          </Button>
        )}
      </div>

      {/* List Content */}
      <div className="space-y-2">
        {data && data.length > 0 ? (
          data.map((item: any, index: number) => {
            const { isExpired, Icon, borderClass, iconColor, iconBg } = getMcuDetails(item);
            const itemFiles = getItemSupportingFiles(item?.id);
            const mcuDate = item?.mcuDate ? new Date(item.mcuDate) : null;
            const mcuExpiredDate = item?.mcuExpiredDate ? new Date(item.mcuExpiredDate) : null;

            return (
              <div
                key={item?.id || index}
                title={t($ => $.employee.mcu.form.mcuExpiredDate.label) + ": " + (mcuExpiredDate ? date_to_string(item.mcuExpiredDate) : "-")}
                className={cn(
                  "group flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200",
                  "bg-white/60 dark:bg-slate-950/40 backdrop-blur-sm",
                  "hover:bg-white/90 dark:hover:bg-slate-900/80 hover:shadow-sm hover:border-border",
                  borderClass
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={cn("p-2 rounded-md flex-shrink-0 transition-colors", iconBg)}>
                    <Icon className={cn("w-4 h-4", iconColor)} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      "text-xs uppercase font-semibold leading-tight truncate",
                      isExpired ? "text-red-500" : "text-emerald-600 dark:text-emerald-500"
                    )}>
                      {isExpired ? t($ => $.employee.detail.expired) : t($ => $.employee.detail.active)}
                    </span>

                    <div className="flex items-center gap-2">
                      <Hospital className="w-3 h-3 text-muted-foreground/70" />
                      <span className="font-semibold text-foreground truncate" title={item?.mcuHospitalName || "-"}>
                        {item?.mcuHospitalName || "-"}
                      </span>
                      {item?.ohihReview && (
                        <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0 h-4 bg-secondary/50 hover:bg-secondary/60">
                          {item.ohihReview}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {mcuDate && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 text-muted-foreground/70" />
                            <span>{t($ => $.employee.mcu.form.mcuDate.label)}: <span className="font-mono text-foreground/80">{date_to_string(item.mcuDate)}</span></span>
                          </div>
                        )}
                        {mcuExpiredDate && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 text-muted-foreground/70" />
                            <span>{t($ => $.employee.mcu.form.mcuExpiredDate.shortLabel)}: <span className="font-mono text-foreground/80">{date_to_string(item.mcuExpiredDate)}</span></span>
                          </div>
                        )}
                      </div>

                      {(item?.statusKelaikanBekerja || item?.skjScore) && (
                        <div className="mt-2 text-xs space-y-2 grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {item?.statusKelaikanBekerja && (
                            <div className="flex flex-col gap-0.5 text-muted-foreground items-start">
                              <span className="font-semibold whitespace-nowrap">{t($ => $.employee.mcu.form.statusKelaikanBekerja.label)}:</span>
                              <LongText text={item.statusKelaikanBekerja} className="text-foreground" isHtml={false} />
                            </div>
                          )}
                          {item?.skjScore && (
                            <div className="flex flex-col gap-0.5 text-muted-foreground items-start">
                              <span className="font-semibold whitespace-nowrap">{t($ => $.employee.mcu.form.skjScore.label)}:</span>
                              <LongText text={item.skjScore} className="text-foreground" isHtml={false} />
                            </div>
                          )}
                        </div>
                      )}

                      {(item?.mcuDeviationNotes || item?.mcuFollowUp) && (
                        <div className="mt-2 text-xs space-y-2 grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {item?.mcuDeviationNotes && (
                            <div className="flex flex-col gap-0.5 text-muted-foreground items-start">
                              <span className="font-semibold whitespace-nowrap">{t($ => $.employee.mcu.form.mcuDeviationNotes.label)}:</span>
                              <LongText text={item.mcuDeviationNotes} className="text-foreground" isHtml={false} />
                            </div>
                          )}
                          {item?.mcuFollowUp && (
                            <div className="flex flex-col gap-0.5 text-muted-foreground items-start">
                              <span className="font-semibold whitespace-nowrap">{t($ => $.employee.mcu.form.mcuFollowUp.label)}:</span>
                              <LongText text={item.mcuFollowUp} className="text-foreground" isHtml={false} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">

                  {/* File Indicator */}
                  {itemFiles.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-semibold">{itemFiles.length}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0 shadow-lg" align="end">
                        <div className="p-2.5 bg-muted/30 border-b flex items-center justify-between">
                          <span className="text-xs font-semibold flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            {t($ => $.employee.mcu.supportingFiles)}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{itemFiles.length}</Badge>
                        </div>
                        <div className="p-1">
                          <AssetListView
                            data={itemFiles}
                            disableAction={disableAction}
                            showSelection={true}
                            onDeleteAssets={onDeleteAssets}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Actions */}
                  {!disableAction && (
                    <DropdownMenu
                      open={openDropdownId === (item?.id || index)}
                      onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? (item?.id || index) : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted text-muted-foreground">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onMcuDataUpdated(t, employeeId, item, setConfirmationPut, onCreateClicked, <FormMcu files={itemFiles} onDeleteAssets={onDeleteAssets} />)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" />
                          <span className="text-xs">{t($ => $.shared.edit)}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteClicked({ section: formKey, sectionId: [item?.id] })}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          <span className="text-xs">{t($ => $.shared.delete)}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-lg bg-muted">
            <div className="p-2 rounded-full bg-muted/50 mb-2">
              <Stethoscope className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t($ => $.employee.detail.noMcuRecords)}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmationCreate && <DialogModalForm modal={confirmationCreate} />}
      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
    </div>
  );
};

export default TableMcu;