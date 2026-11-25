import { ControlForm } from "@/components/custom/forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPLOYEE_TYPE } from "@/constants/app-enum";
import { useAppTranslation } from "@/lib/i18n-typed";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubTypesCreate } from "@/service/sub-types/sub-types-create";
import { useSubTypesList } from "@/service/sub-type-api";
import { Button } from "@/components/ui/button";

import { LuPlus, LuX } from "react-icons/lu";
import { Input } from "@/components/ui/input";
import { showNotifSuccess } from "@/lib/show-notif";

const FormGeneral = ({ values, form, isFormCreate = false, ...props }: any) => {
  const { t } = useAppTranslation();
  const watchCategory = form.watch("category");
  const watchStatusOnDuty = form.watch("statusOnDuty");
  const originalStatusOnDuty = form.formState.defaultValues?.originalStatusOnDuty;
  const [isAddSubtypeOpen, setIsAddSubtypeOpen] = useState(false);
  const [newSubTypeName, setNewSubTypeName] = useState("");
  const [subTypeError, setSubTypeError] = useState("");
  const queryClient = useQueryClient();
  const createSubtypeMutation = useSubTypesCreate();
  const subTypesListQuery = useSubTypesList();

  const projectIdItem = {
    ...values?.projectId,
    options: [
      { value: "", label: (t($ => $.employee.detail.noProject)).toUpperCase() },
      ...(subTypesListQuery.data?.map((item: any) => ({
        value: item.id,
        label: item.name,
      })) || values?.projectId?.options || []).sort((a: any, b: any) => a.label.localeCompare(b.label)),
    ],
  };

  const handleCreateSubtype = () => {
    if (!newSubTypeName) return;
    setSubTypeError("");
    createSubtypeMutation.mutate(
      { name: newSubTypeName },
      {
        onSuccess: (data) => {
          showNotifSuccess({ message: data?.message || t($ => $.shared.success) });
          queryClient.invalidateQueries({ queryKey: ["sub-types-list"] });
          setIsAddSubtypeOpen(false);
          setNewSubTypeName("");
        },
        onError: (error: any) => {
          setSubTypeError(
            (error?.response?.data?.message || error?.response?.data?.error) ??
            error?.message
          );
        },
      }
    );
  };

  return (
    <>
      <Tabs defaultValue="general">
        <TabsList className="w-full">
          <TabsTrigger value="general">{t($ => $.employee.updateEmployee.tabGeneral)}</TabsTrigger>
          <TabsTrigger value="category">{t($ => $.employee.updateEmployee.tabCategory)}</TabsTrigger>
          {(isFormCreate === false) && <TabsTrigger value="validation">{t($ => $.employee.updateEmployee.tabValidation)}</TabsTrigger>}
          {/* <TabsTrigger value="status">{t($ => $.employee.updateEmployee.tabStatus)}</TabsTrigger> */}
        </TabsList>
        <TabsContent value="general">
          <div className={"flex flex-col gap-4 w-full min-h-[300px]"}>
            {/* employeeName */}
            <ControlForm form={form} item={values?.employeeName} showMessage={false} />

            {/* date of birth  */}
            <ControlForm form={form} item={values?.dateOfBirth} showMessage={false} />

            {/* identity number */}
            <ControlForm form={form} item={values?.identityNumber} showMessage={false} />

            {/* hssePassportNumber */}
            <ControlForm
              form={form}
              item={values?.hssePassportNumber}
              showMessage={false}
              onKeyDown={(e: any) => {
                if (e.key === " ") {
                  e.preventDefault();
                }
              }}
              onChange={(e: any) => {
                const val = e.target.value.replace(/\s/g, "");
                form.setValue("hssePassportNumber", val, { shouldValidate: true, shouldDirty: true });
              }}
            />
          </div>
        </TabsContent>
        <TabsContent value="category">
          <div className={"flex flex-col gap-4 w-full min-h-[300px]"}>
            {/* category */}
            <ControlForm form={form} item={values?.category} showMessage={false} />

            {/* projectId */}
            <div className="flex flex-col gap-2 w-full">
              {watchCategory !== EMPLOYEE_TYPE.marine.value && (
                <div className="flex gap-2 items-end w-full h-full">
                  <div className="w-full">
                    <ControlForm
                      form={form}
                      item={projectIdItem}
                      showMessage={false}
                    />
                  </div>
                  <div className="">
                    <Button
                      type="button"
                      variant={isAddSubtypeOpen ? "destructive" : "outline"}
                      size="icon"
                      className="shrink-0"
                      onClick={() => setIsAddSubtypeOpen(!isAddSubtypeOpen)}
                      title={
                        isAddSubtypeOpen
                          ? t($ => $.shared.cancel)
                          : t($ => $.subTypes.addProjectName)
                      }
                    >
                      {isAddSubtypeOpen ? (
                        <LuX className="h-4 w-4" />
                      ) : (
                        <LuPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>)}

              {isAddSubtypeOpen && (
                <div className="flex flex-col w-full animate-in fade-in slide-in-from-top-2 duration-200 pl-2">
                  <div className="flex gap-2 items-center w-full">
                    <Input
                      placeholder={t($ => $.subTypes.newProject)}
                      value={newSubTypeName}
                      onChange={(e) => {
                        setNewSubTypeName(e.target.value);
                        if (subTypeError) setSubTypeError("");
                      }}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateSubtype();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleCreateSubtype}
                      disabled={createSubtypeMutation.isPending || !newSubTypeName}
                      className="shrink-0"
                      variant={"subtle-info"}
                    >
                      {createSubtypeMutation.isPending && (
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                      )}
                      {t($ => $.shared.add)}
                    </Button>
                  </div>
                  {subTypeError && (
                    <span className="text-destructive text-xs ml-1 mt-1">
                      {subTypeError}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* location */}
            <ControlForm form={form} item={values?.location} showMessage={false} />

            {/* subContractorId */}
            <ControlForm form={form} item={values?.subContractorId} showMessage={false} />

            {/* vesselId */}
            {watchCategory === EMPLOYEE_TYPE.marine.value && (
              <ControlForm form={form} item={values?.vesselId} showMessage={false} />
            )}

            {/* position */}
            <ControlForm form={form} item={values?.position} showMessage={false} />

          </div>
        </TabsContent>
        {/* <TabsContent value="status">
          <div className={"flex flex-col gap-4 w-full min-h-[300px]"}>
            
            {values?.statusOnDuty && (
              <ControlForm form={form} item={values?.statusOnDuty} showMessage={false} />
            )}

            statusChangeDate
            {values?.statusChangeDate && (!values?.statusChangeDate?.isShow || values.statusChangeDate.isShow({ statusOnDuty: watchStatusOnDuty, originalStatusOnDuty: originalStatusOnDuty })) && (
              <ControlForm form={form} item={values?.statusChangeDate} showMessage={false} />
            )}
          </div>
        </TabsContent> */}
        <TabsContent value="validation">
          <div className={"flex flex-col gap-4 w-full min-h-[300px]"}>
            {/* remarks */}
            <ControlForm form={form} item={values?.remarks} showMessage={false} />

            {/* verifiedBy */}
            <ControlForm form={form} item={values?.verifiedBy} showMessage={false} />

            {/* verifiedDate */}
            {(!values?.verifiedDate?.isShow || values.verifiedDate.isShow({ statusOnDuty: watchStatusOnDuty, originalStatusOnDuty: originalStatusOnDuty })) && (
              <ControlForm form={form} item={values?.verifiedDate} showMessage={false} />
            )}
          </div>
        </TabsContent>
      </Tabs>


    </>
  );
};

export default FormGeneral;