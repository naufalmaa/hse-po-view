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
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import { BPJS_TYPE } from "@/constants/app-enum";
import { AssetListView } from "@/components/pages/daily-report/create";
import FormBpjs from "./FormBpjs";
import { onBpjsDataUpdated, onBpjsDataCreated } from "./template/bpjs";
import { cn } from "@/lib/utils";
import { Bpjs } from "@/service/employee/employee-details";
import {
  Heart,
  Shield,
  Plus,
  MoreVertical,
  FileText,
  Pencil,
  Trash2,
  CreditCard
} from "lucide-react";

type Props = {
  employeeId: string,
  formKey: string;
  data: Bpjs[];
  onCreateClicked: (id: string, body: Record<string, any>) => void;
  onUpdateClicked: (id: string, body: Record<string, any>) => void;
  onDeleteClicked: (body: any) => void;
  disableAction?: boolean,
  rowId?: string,
  onDeleteAssets?: (item: any[]) => void,
  supportingFiles?: any[],
}

const TableBpjs = ({
  employeeId,
  formKey,
  data,
  onCreateClicked,
  onUpdateClicked,
  onDeleteClicked,
  disableAction = false,
  onDeleteAssets,
  supportingFiles,
  rowId = "bpjsId",
  ...props
}: Props) => {
  const { t } = useAppTranslation();
  const [confirmationCreate, setConfirmationCreate] = useState<ModalFormProps | null>(null);
  const [confirmationPut, setConfirmationPut] = useState<ModalFormProps | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const getBpjsDetails = (item: any) => {
    const isHealth = item?.bpjsEmployment === "" || !item?.bpjsEmployment;
    const type = isHealth ? BPJS_TYPE.kesehatan : BPJS_TYPE.ketenagakerjaan;
    const number = isHealth ? item?.bpjsHealth : item?.bpjsEmployment;

    return {
      type,
      number,
      isHealth,
      // Design tokens
      borderClass: isHealth
        ? "hover:border-purple-200 dark:hover:border-purple-800"
        : "hover:border-blue-200 dark:hover:border-blue-800",
      iconColor: isHealth ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400",
      iconBg: isHealth ? "bg-purple-100/50 dark:bg-purple-900/30" : "bg-blue-100/50 dark:bg-blue-900/30",
      Icon: isHealth ? Heart : Shield
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
            <CreditCard className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t($ => $.employee.bpjs.title)}</h3>
          </div>
          <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-5 justify-center">
            {data?.length || 0}
          </Badge>
        </div>

        {!disableAction && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onBpjsDataCreated(t, employeeId, setConfirmationCreate, onCreateClicked, <FormBpjs />)}
            className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/5"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t($ => $.employee.bpjs.add)}
          </Button>
        )}
      </div>

      {/* List Content */}
      <div className="space-y-2">
        {data && data.length > 0 ? (
          data.map((item: any, index: number) => {
            const { type, number, Icon, borderClass, iconColor, iconBg } = getBpjsDetails(item);
            const itemFiles = getItemSupportingFiles(item?.id);

            return (
              <div
                key={item?.id || index}
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
                    <span className="text-xs uppercase font-semibold text-muted-foreground leading-tight truncate">
                      {type.label}
                    </span>
                    <span className="font-mono font-medium text-foreground truncate" title={number || "-"}>
                      {number || "-"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {/* File Indicator */}
                  {itemFiles.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{itemFiles.length}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0 shadow-lg" align="end">
                        <div className="p-2.5 bg-muted/30 border-b flex items-center justify-between">
                          <span className="text-xs font-semibold flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            {t($ => $.employee.bpjs.supportingFiles)}
                          </span>
                          <Badge variant="outline" className="text-xs h-4 px-1">{itemFiles.length}</Badge>
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
                        <DropdownMenuItem onClick={() => onBpjsDataUpdated(t, employeeId, item, setConfirmationPut, onCreateClicked, <FormBpjs files={itemFiles} />)}>
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
              <Shield className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t($ => $.employee.bpjs.noRecords)}
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

export default TableBpjs;