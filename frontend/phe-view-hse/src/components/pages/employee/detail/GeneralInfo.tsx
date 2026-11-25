import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";
import { getShortName } from "@/lib/my-utils";
import { EMPLOYEE_TYPE, getEmployeeColor, getEmployeeLabel } from "@/constants/app-enum";
import { Badge } from "@/components/ui/badge";
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import FormGeneral from "./FormGeneral";
import { Pencil, Calendar, CreditCard, MapPin, FileCheck, UserCheck, Briefcase, FileText, CheckCircle2, ShipIcon, Locate, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormCategory from "./FormCategory";
import { onDataUpdated as onDataUpdatedEmployee } from "./template/employee";
import { Separator } from "@/components/ui/separator";
import { CiEdit } from "react-icons/ci";
import { z } from "zod"
import { AppTranslation } from "@/lib/i18n-typed";

type Props = {
  info: Record<string, any>;
  onUpdateClicked: (id: string, body: any) => void;
  formData: any;
  t: AppTranslation;
  disableEditing: boolean;
}

const DetailRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) => (
  <div className="flex items-start gap-3 group">
    <div className="mt-0.5 p-1.5 rounded-md bg-muted/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
      <Icon size={16} strokeWidth={2} />
    </div>
    <div className="flex-1 space-y-0.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground leading-snug break-words">{value || "-"}</p>
    </div>
  </div>
);

export const GeneralInfo = ({ info, onUpdateClicked, formData, t, disableEditing }: Props) => {
  const [confirmationPut, setConfirmationPut] = React.useState<ModalFormProps | null>(null);
  const [isEditingAvatar, setIsEditingAvatar] = React.useState(false);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const shortName = getShortName(info?.employee?.employeeName);
  const statusOnDuty = info?.employee?.statusOnDuty ?? false;
  // Use slightly more vibrant colors for the status dot
  const statusOnDutyColor = statusOnDuty ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
  const categoryColor = getEmployeeColor(info?.employee?.category);
  const categoryLabel = getEmployeeLabel(info?.employee?.category);

  const onDataCategoryUpdated_ = (obj: any) => {
    setConfirmationPut({
      title: t($ => $.employee.detail.updateEmployeeInfo),
      desc: t($ => $.employee.detail.fillFormToUpdateEmployee),
      defaultValue: {
        category: obj?.category ?? "",
        subContractorId: obj?.subContractorId ?? "",
        projectId: obj?.projectId ?? "",
        vesselId: obj?.vesselId ?? "",
        location: obj?.location ?? "",
      },
      child: {
        category: formData.form.category,
        subContractorId: formData.form.subContractorId,
        projectId: formData.form.projectId,
        vesselId: formData.form.vesselId,
        location: formData.form.location,
      },
      schema: {
        category: z.string().min(1, { message: t($ => $.employee.form.category.required) }),
        subContractorId: z.string().min(1, { message: t($ => $.employee.form.subContractorId.required) }),
        projectId: z.string().min(0, { message: t($ => $.employee.form.projectId.required) }),
        vesselId: z.string().min(0, { message: t($ => $.employee.form.vesselId.required) }),
        location: z.string().min(1, { message: t($ => $.employee.form.location.required) }),
      },
      content: <FormCategory />,
      onCancelClick: () => setConfirmationPut(null),
      onConfirmClick: (body: Record<string, string>) => {
        let data_: Record<string, any> = {
          category: body?.category,
          subContractorId: body?.subContractorId,
          projectId: body?.projectId,
          vesselId: body?.vesselId,
          location: body?.location,
        }
        if (body?.category === EMPLOYEE_TYPE.marine.value) {
          delete data_?.projectId;
        } else {
          delete data_?.vesselId;
        }
        const newBody = {
          key: "general", data: data_
        }
        onUpdateClicked(info?.employee?.id, newBody);
        setConfirmationPut(null);
      },
    });
  };

  const submitAvatarAction = async () => {
    if (!selectedFile) return;

    try {
      let body_ = {
        key: "general",
        data: { id: info?.employee?.id, image: selectedFile },
        fileKey: [],
        files: [],
      }
      onUpdateClicked(info?.employee?.id, body_);

      setIsEditingAvatar(false);
      setSelectedFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const changeAvatarAction = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setIsEditingAvatar(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const cancelAvatarChange = () => {
    setSelectedFile(null);
    setAvatarPreview(null);
    setIsEditingAvatar(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Profile Header Section */}
      <div className="relative flex flex-col items-center px-6 pt-8 pb-6 bg-gradient-to-b from-primary/5 via-background to-background">

        {/* Helper Edit Button (Top Right) */}
        {!disableEditing && (
          <div className="absolute top-4 right-4">
            <Button
              size="icon"
              variant="outline"
              className="w-7 h-7 rounded-full"
              onClick={() => {
                onDataUpdatedEmployee(info?.employee?.id, info?.employee, <FormGeneral />, setConfirmationPut, onUpdateClicked, formData, t);
              }}
            >
              <CiEdit className="text-primary w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Avatar */}
        <div className="relative group mb-4">
          <Avatar className="w-28 h-28 border-4 border-background shadow-xl ring-1 ring-border/50">
            <AvatarImage src={avatarPreview || info?.employee?.imageUrl} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">{shortName}</AvatarFallback>
          </Avatar>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {!disableEditing && !isEditingAvatar && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105"
              onClick={changeAvatarAction}
            >
              <CiEdit className="text-primary w-4 h-4" />
            </Button>
          )}

          {isEditingAvatar && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2 w-max animate-in fade-in zoom-in-95 duration-200">
              <Button
                size="sm"
                variant="destructive"
                className="h-6 text-[10px] px-2 shadow-md rounded-full"
                onClick={cancelAvatarChange}
              >
                {t($ => $.employee.detail.cancel)}
              </Button>
              <Button
                size="sm"
                className="h-6 text-[10px] px-2 shadow-md rounded-full"
                onClick={submitAvatarAction}
              >
                {t($ => $.employee.detail.save)}
              </Button>
            </div>
          )}
        </div>

        {/* Name & Title */}
        <div className="text-center space-y-1 mb-4">
          <h2 className="text-xl font-bold text-foreground leading-tight px-2">
            {info?.employee?.employeeName}
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            {info?.employee?.position}
          </p>
        </div>

        {/* Badges */}
        <div className="flex gap-2 justify-center w-full">
          <Badge variant="outline" className="pl-1.5 pr-2.5 py-0.5 bg-background shadow-sm border-muted-foreground/20 text-muted-foreground font-normal">
            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusOnDutyColor}`} />
            {statusOnDuty ? t($ => $.employee.detail.onDuty) : t($ => $.employee.detail.offDuty)}
          </Badge>

          <Badge variant="outline" className="px-2.5 py-0.5 bg-background shadow-sm border-muted-foreground/20 text-muted-foreground font-normal">
            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${categoryColor}`}></span>
            {categoryLabel}
          </Badge>
          <div>
            {!disableEditing && (
              <Button
                size="icon"
                variant="outline"
                className="w-7 h-7 rounded-full"
                onClick={() => onDataCategoryUpdated_(info?.employee)}
              >
                <CiEdit className="text-primary w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Details List */}
      <div className="flex-1 p-6 space-y-3">
        <DetailRow
          icon={CreditCard}
          label={t($ => $.employee.detail.idKtp)}
          value={info?.employee?.identityNumber}
        />
        <DetailRow
          icon={Calendar}
          label={t($ => $.employee.detail.dateOfBirth)}
          value={info?.employee?.dateOfBirth}
        />
        <DetailRow
          icon={MapPin}
          label={t($ => $.employee.detail.bargeLocation)}
          value={info?.employee?.location}
        />
        <DetailRow
          icon={FileCheck}
          label={t($ => $.employee.detail.idHsse)}
          value={info?.employee?.hssePassportNumber}
        />

        <Separator className="my-2" />

        {info?.employee?.category !== EMPLOYEE_TYPE.marine.value && <DetailRow
          icon={Briefcase}
          label={t($ => $.employee.detail.projectName)}
          value={info?.employee?.projectName}
        />}

        <DetailRow
          icon={Building2}
          label={t($ => $.employee.detail.subContractor)}
          value={info?.employee?.subContractorName}
        />

        {info?.employee?.category === EMPLOYEE_TYPE.marine.value && (
          <DetailRow
            icon={ShipIcon}
            label={t($ => $.employee.detail.vesselName)}
            value={info?.employee?.vesselName}
          />
        )}

        <DetailRow
          icon={Locate}
          label={t($ => $.employee.detail.position)}
          value={info?.employee?.position}
        />

        <Separator className="my-2" />

        <DetailRow
          icon={UserCheck}
          label={t($ => $.employee.detail.verifiedBy)}
          value={info?.employee?.verifiedBy}
        />
        <DetailRow
          icon={CheckCircle2}
          label={t($ => $.employee.detail.validationStatus)}
          value={
            info?.employee?.validationStatus ? (
              <Badge variant="secondary" className="font-normal text-xs px-2 h-5">
                {info?.employee?.validationStatus}
              </Badge>
            ) : "-"
          }
        />
        <DetailRow
          icon={Calendar}
          label={t($ => $.employee.detail.verifiedDate)}
          value={info?.employee?.verifiedDate}
        />

        {info?.employee?.remarks && (
          <div className="pt-2">
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 text-sm">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <FileText size={14} />
                <span className="text-xs font-semibold uppercase">{t($ => $.employee.detail.remarks)}</span>
              </div>
              <p className="text-foreground/90 leading-relaxed italic">
                "{info?.employee?.remarks}"
              </p>
            </div>
          </div>
        )}
      </div>

      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
    </div>
  )
}