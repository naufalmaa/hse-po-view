import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useAppTranslation } from "@/lib/i18n-typed";
import { DataTablePagination } from "@/components/custom/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getShortName, getDaysFromCurrentDate, } from "@/lib/my-utils";
import { Button } from "@/components/ui/button";
import { CiEdit, CiTrash, CiCirclePlus } from "react-icons/ci";
import { getStatusDateFromObject } from "@/lib/app-utils";
import FormGeneral from "@/components/pages/employee/detail/FormGeneral";
import { onDataUpdated as onDataUpdatedEmployee } from "@/components/pages/employee/detail/template/employee";
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import { getEmployeeColor, getEmployeeLabel, EMPLOYEE_TYPE } from "@/constants/app-enum";
import { LuClock } from "react-icons/lu";
import { MdCheckCircle, MdInfo, MdWarningAmber } from "react-icons/md";
import {
    FormContract, onContractDataCreated, onContractDataUpdated,
    FormMcu, onMcuDataCreated, onMcuDataUpdated,
    FormVaccine, onVaccinationDataCreated, onVaccinationDataUpdated,
    FormSika, onSikaDataCreated, onSikaDataUpdated,
    FormCertificate, onCertificateDataCreated, onCertificateDataUpdated,
    FormBpjs, onBpjsDataCreated, onBpjsDataUpdated
} from "../detail";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmployeeCertificate, EmployeeListResponse } from "@/service/employee/employee-list";
import { openStatusChangeDialog } from "./DialogStatusChange";

type Props = {
    data: EmployeeListResponse;
    onDetailClicked?: (id: string) => void;
    onDeleteClicked?: (item: any) => void;
    onPaginationChange?: (paginationData: { page: number; limit: number; total?: number; totalPages?: number }) => void;
    paginationData: {
        page: number; // Current page (1-based)
        limit: number; // Page size
        total: number; // Total row count
        totalPages: number; // Total pages
    };
    enableAction?: boolean;
    isAdmin?: boolean;
    onEmployeeUpdated: (employeeId: string, body: Record<string, any>) => void;
    formData?: any;
    userRole?: string;
    onManageAttendance?: (body: any) => void;
}

export const getOhihColor = (ohih: string) => {
    switch (ohih?.toUpperCase()) {
        case 'P1': return 'bg-emerald-500 text-white border-emerald-600';
        case 'P2': return 'bg-lime-500 text-white border-lime-600';
        case 'P3': return 'bg-yellow-500 text-white border-yellow-600';
        case 'P4': return 'bg-orange-500 text-white border-orange-600';
        case 'P5': return 'bg-red-500 text-white border-red-600';
        case 'P6': return 'bg-red-900 text-white border-red-950';
        case 'P7': return 'bg-slate-900 text-white border-black';
        default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
}

const CardDetailsEmployee = ({
    data,
    onDetailClicked,
    onDeleteClicked,
    onPaginationChange,
    paginationData,
    enableAction = true,
    isAdmin = false,
    onEmployeeUpdated,
    formData,
    userRole,
    onManageAttendance
}: Props) => {
    const { t } = useAppTranslation();
    const navigate = useNavigate();
    const [confirmationPut, setConfirmationPut] = React.useState<any | null>(null);
    const [confirmationSectionCreate, setConfirmationSectionCreate] = React.useState<ModalFormProps | null>(null);

    // Get supporting files for a specific contract item
    const getItemSupportingFiles = (supportingFiles: any[], rowId: string, itemId: string) => {
        return supportingFiles?.filter((file: any) => file?.[rowId] === itemId) ?? [];
    };

    const BadgeStatus = ({
        status,
        keyStatus = "value",
        icon,
        handleCreateItem,
        handleEditItem,
        enableAction = true
    }: any) => {
        const hasData = status.item !== undefined;
        const [badgeMenuOpen, setBadgeMenuOpen] = React.useState(false);

        const handleCreate = () => {
            if (handleCreateItem) {
                handleCreateItem();
            }
        };

        const handleEdit = () => {
            if (handleEditItem) {
                handleEditItem();
            }
        };

        // If enableAction is false, render a simple badge without dropdown
        if (!enableAction) {
            return (
                <Badge
                    variant={"outline"}
                    className={`${status.styles}`}
                >
                    {icon}<span className="">{status?.[keyStatus]}</span>
                </Badge>
            );
        }

        return (
            <div className="flex items-center gap-1 group">
                <DropdownMenu open={badgeMenuOpen} onOpenChange={setBadgeMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <Badge
                            variant={"outline"}
                            className={`${status.styles} 
                cursor-pointer 
                transition-all duration-200 
                hover:bg-accent 
                hover:text-accent-foreground 
                hover:border-accent-foreground/20 
                hover:shadow-sm 
                focus-visible:outline-none 
                focus-visible:ring-2 
                focus-visible:ring-ring 
                focus-visible:ring-offset-2 
                active:scale-95
              `}
                            title="Click to see options"
                            tabIndex={0}
                            role="button"
                        >
                            {icon}<span className="">{status?.[keyStatus]}</span>
                        </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { handleCreate(); setBadgeMenuOpen(false); }}>
                            <CiCirclePlus className="mr-2 h-4 w-4" /> {t($ => $.shared.create)}
                        </DropdownMenuItem>
                        {hasData && (
                            <DropdownMenuItem onClick={() => { handleEdit(); setBadgeMenuOpen(false); }}>
                                <CiEdit className="mr-2 h-4 w-4" /> {t($ => $.shared.edit)}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.data.map((employee, index: number) => {
                    // Get last update badge info
                    const lastUpdateInfo = getDaysFromCurrentDate(t, employee.updatedAt);

                    // Get certificate and sika data for this employee
                    const certificates = employee?.certificates ?? [];
                    const sika = employee?.sika ?? [];

                    // Get various status dates
                    const contractExpiredDate = getStatusDateFromObject(employee?.contracts ?? []);
                    const mcuExpiredDate = getStatusDateFromObject(employee?.mcus ?? [], "mcuExpiredDate");

                    const vaccinationsExpiredDate = getStatusDateFromObject(employee?.vaccinations ?? [], "vaccineDate", true);
                    const sikaExpiredDate = getStatusDateFromObject(sika ?? []);

                    // BPJS status logic
                    const bpjsRows = employee?.bpjs ?? [];
                    const bpjsStatusBase = getStatusDateFromObject(bpjsRows);
                    const hasEmployment = bpjsRows.some((r: any) => r.bpjsEmployment && r.bpjsEmployment !== "");
                    const hasHealth = bpjsRows.some((r: any) => r.bpjsHealth && r.bpjsHealth !== "");

                    let bpjsDisplayValue = t($ => $.employeeList.status.missing);
                    if (hasEmployment && hasHealth) {
                        bpjsDisplayValue = "Lengkap (TK & KES)";
                    } else if (hasEmployment) {
                        bpjsDisplayValue = "Ketenagakerjaan";
                    } else if (hasHealth) {
                        bpjsDisplayValue = "Kesehatan";
                    }

                    const bpjsStatus = {
                        ...bpjsStatusBase,
                        status: (hasEmployment || hasHealth) ? "active" : "missing",
                        value: bpjsDisplayValue,
                        icon: (hasEmployment && hasHealth)
                            ? MdCheckCircle
                            : (hasEmployment || hasHealth)
                                ? MdInfo
                                : MdWarningAmber,
                        styles: (hasEmployment && hasHealth)
                            ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900'
                            : (hasEmployment || hasHealth)
                                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900'
                                : 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900'
                    };

                    // Get BSS status
                    const bssCertificates = certificates.filter((cert: EmployeeCertificate) => cert.aliases?.toLowerCase().includes("bss") ?? false);
                    const bssStatus = getStatusDateFromObject(bssCertificates);

                    // Get BST status
                    const bstCertificates = certificates.filter((cert: EmployeeCertificate) => cert.aliases?.toLowerCase().includes("bst") ?? false);
                    const bstStatus = getStatusDateFromObject(bstCertificates);

                    const showBss = (bssStatus.item !== undefined) && (bstStatus.item === undefined);
                    const showBst = !showBss;

                    // Get other certificates status
                    const otherCertificates = certificates.filter((cert: EmployeeCertificate) => {
                        const nameCheck = !cert.name.toLowerCase().includes("bss") && !cert.name.toLowerCase().includes("bst");
                        const aliasCheck = !(cert.aliases?.toLowerCase().includes("bss") ?? false) && !(cert.aliases?.toLowerCase().includes("bst") ?? false);
                        return nameCheck && aliasCheck;
                    });
                    const certificateStatus = getStatusDateFromObject(otherCertificates);

                    // Latest OHIH Review
                    const latestMcu = [...(employee?.mcus ?? [])].sort((a, b) => new Date(b.mcuDate).getTime() - new Date(a.mcuDate).getTime())[0];
                    const latestOhih = latestMcu?.ohihReview;

                    return (
                        <div key={employee.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            {/* Employee header */}
                            <div className="flex items-start gap-3 mb-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={employee.imageUrl} />
                                    <AvatarFallback className="bg-secondary">
                                        {getShortName(employee.employeeName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div
                                        className="font-medium text-sm cursor-pointer hover:underline truncate"
                                        onClick={() => onDetailClicked && onDetailClicked(employee.id)}
                                    >
                                        {employee.employeeName}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {employee.subContractorName}
                                    </div>
                                </div>
                            </div>

                            {/* Category and Status */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge variant={"outline"}>
                                    <span className={`w-2 h-2 rounded-full ${getEmployeeColor(employee.category)}`}></span>
                                    {getEmployeeLabel(employee.category) || employee.category || t($ => $.employeeList.table.na)}
                                </Badge>
                                <Badge
                                     variant={"outline"}
                                     className={(isAdmin || userRole === 'contractor') ? "cursor-pointer hover:bg-accent" : ""}
                                     {...((isAdmin || userRole === 'contractor') ? {
                                         onClick: () => {
                                             if (employee.id) {
                                                 if (userRole === 'contractor' && onManageAttendance) {
                                                     openStatusChangeDialog(t, employee.id, employee.statusOnDuty, setConfirmationPut, onManageAttendance);
                                                 } else if (isAdmin) {
                                                     navigate({ to: `/employee/attendance/${employee.id}` as any });
                                                 }
                                             }
                                         }
                                     } : {})}
                                 >
                                    <span className={`w-2 h-2 rounded-full ${employee.statusOnDuty ? "bg-green-500" : "bg-red-500"}`} />
                                    {employee.statusOnDuty ? t($ => $.employeeList.status.onDuty) : t($ => $.employeeList.status.off)}
                                </Badge>
                            </div>

                            {/* Employee details grid */}
                            <div className="space-y-3">
                                {/* Identity Number */}
                                {employee.hssePassportNumber && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{t($ => $.employeeList.table.hsseEPassport)}</span>
                                        <div className="flex items-center gap-1">
                                            {/* <LuUser className="h-4 w-4 text-muted-foreground" /> */}
                                            <span>{employee.hssePassportNumber}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Position */}
                                {employee.position && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{t($ => $.employeeList.table.position)}</span>
                                        <div className="flex items-center gap-1">
                                            {/* <LuBriefcase className="h-4 w-4 text-muted-foreground" /> */}
                                            <span>{employee.position}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Location */}
                                {employee.location && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{t($ => $.employeeList.table.location)}</span>
                                        <div className="flex items-center gap-1">
                                            {/* <LuMapPin className="h-4 w-4 text-muted-foreground" /> */}
                                            <span>{employee.location}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Vessel */}
                                {employee.vesselName && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{t($ => $.employeeList.table.vesselName)}</span>
                                        <div className="flex items-center gap-1">
                                            {/* <LuSailboat className="h-4 w-4 text-muted-foreground" /> */}
                                            <span>{employee.vesselName}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Date of Birth */}
                                {employee.dateOfBirth && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{t($ => $.employeeList.table.dateOfBirth)}</span>
                                        <div className="flex items-center gap-1">
                                            {/* <LuCalendar className="h-4 w-4 text-muted-foreground" /> */}
                                            <span>{employee.dateOfBirth}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Last Update Status */}
                                {employee.lastStatusUpdate && (
                                    <div className="flex flex-row justify-between text-sm">
                                        <span className="text-muted-foreground">{t($ => $.employeeList.table.daysOnBoard)}</span>
                                        <div className="flex items-center gap-1">
                                            {/* <LuUser className="h-4 w-4 text-muted-foreground" /> */}
                                            {/* <span>{date_to_string(string_to_date(employee.lastStatusUpdate), "yyyy-MM-dd HH:mm")}</span> */}
                                            <span>{employee.daysOnBoard || "0"} {t($ => $.employeeList.table.days)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Latest OHIH Review */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{t($ => $.employeeList.table.ohih)}</span>
                                    {latestOhih ? (
                                        <Badge className={`${getOhihColor(latestOhih)} font-bold px-2 py-0 h-5`}>
                                            {latestOhih}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground/60 italic">No Data</span>
                                    )}
                                </div>
                            </div>

                            {/* Status badges grid */}
                            <div className="space-y-2 mt-3 pt-3 border-t border-border">
                                {/* BPJS Status */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.bpjs)}</span>
                                    <BadgeStatus
                                        enableAction={enableAction}
                                        status={bpjsStatus}
                                        handleCreateItem={() => {
                                            onBpjsDataCreated(
                                                t,
                                                employee.id,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormBpjs />
                                            )
                                        }}
                                        handleEditItem={() => {
                                            const itemFiles = getItemSupportingFiles(employee?.files, "bpjsId", bpjsStatus.item?.id);
                                            onBpjsDataUpdated(
                                                t,
                                                employee.id,
                                                bpjsStatus.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormBpjs files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                {/* Contract Expired Date */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.contractExpiredDate)}</span>
                                    <BadgeStatus
                                        enableAction={enableAction}
                                        status={contractExpiredDate}
                                        handleCreateItem={() => {
                                            onContractDataCreated(
                                                t,
                                                employee.id,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormContract />
                                            )
                                        }}
                                        handleEditItem={() => {
                                            const itemFiles = getItemSupportingFiles(employee?.files, "contractId", contractExpiredDate.item?.id);
                                            onContractDataUpdated(
                                                t,
                                                employee.id,
                                                contractExpiredDate.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormContract files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                {/* MCU Expired Date */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.mcuExpiredDate)}</span>
                                    <BadgeStatus
                                        enableAction={enableAction}
                                        status={mcuExpiredDate}
                                        handleCreateItem={() => {
                                            onMcuDataCreated(
                                                t,
                                                employee.id,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormMcu />
                                            )
                                        }}
                                        handleEditItem={() => {
                                            const itemFiles = getItemSupportingFiles(employee?.files, "mcuId", mcuExpiredDate.item?.id);
                                            onMcuDataUpdated(
                                                t,
                                                employee.id,
                                                mcuExpiredDate.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormMcu files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                {/* Vaccinations Expired Date */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.vaccinationsExpiredDate)}</span>
                                    <BadgeStatus
                                        enableAction={enableAction}
                                        status={vaccinationsExpiredDate}
                                        handleCreateItem={() => {
                                            onVaccinationDataCreated(
                                                t,
                                                employee.id,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormVaccine />
                                            )
                                        }}
                                        handleEditItem={() => {
                                            const itemFiles = getItemSupportingFiles(employee?.files, "vaccinationId", vaccinationsExpiredDate.item?.id);
                                            onVaccinationDataUpdated(
                                                t,
                                                employee.id,
                                                vaccinationsExpiredDate.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormVaccine files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                {/* Sika Expired Date */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.sikaExpiredDate)}</span>
                                    <BadgeStatus
                                        enableAction={enableAction}
                                        status={sikaExpiredDate}
                                        handleCreateItem={() => {
                                            onSikaDataCreated(
                                                t,
                                                employee.id,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormSika />
                                            )
                                        }}
                                        handleEditItem={() => {
                                            const itemFiles = getItemSupportingFiles(employee?.files, "sikaId", sikaExpiredDate.item?.id);
                                            onSikaDataUpdated(
                                                t,
                                                employee.id,
                                                sikaExpiredDate.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormSika files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.bssExpiredDate)}</span>
                                    <BadgeStatus
                                        enableAction={enableAction}
                                        status={bssStatus}
                                        handleCreateItem={() => {
                                            onCertificateDataCreated(
                                                t,
                                                employee.id,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormCertificate />
                                            )
                                        }}
                                        handleEditItem={() => {
                                            const itemFiles = getItemSupportingFiles(employee?.files, "certificateId", bssStatus.item?.id);
                                            onCertificateDataUpdated(
                                                t,
                                                employee.id,
                                                bssStatus.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormCertificate files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.bst)}</span>
                                    <BadgeStatus
                                        enableAction={enableAction}
                                        status={bstStatus}
                                        handleCreateItem={() => {
                                            onCertificateDataCreated(
                                                t,
                                                employee.id,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormCertificate />
                                            )
                                        }}
                                        handleEditItem={() => {
                                            const itemFiles = getItemSupportingFiles(employee?.files, "certificateId", bstStatus.item?.id);
                                            onCertificateDataUpdated(
                                                t,
                                                employee.id,
                                                bstStatus.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormCertificate files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                {/* Certificate Expired Date */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.certificateExpiredDate)}</span>
                                    <BadgeStatus
                                        enableAction={enableAction}
                                        status={certificateStatus}
                                        handleCreateItem={() => {
                                            onCertificateDataCreated(
                                                t,
                                                employee.id,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormCertificate />
                                            )
                                        }}
                                        handleEditItem={() => {
                                            const itemFiles = getItemSupportingFiles(employee?.files, "certificateId", certificateStatus.item?.id);
                                            onCertificateDataUpdated(
                                                t,
                                                employee.id,
                                                certificateStatus.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormCertificate files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Last update info and action buttons in the same row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-border">
                                <div className="flex items-center gap-2">
                                    <LuClock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{lastUpdateInfo.labels}</span>
                                </div>

                                {enableAction && (<div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDataUpdatedEmployee(employee.id, employee, <FormGeneral isFormCreate={false} />, setConfirmationPut, onEmployeeUpdated, formData, t)}
                                        className="h-8 px-2"
                                    >
                                        <CiEdit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDeleteClicked && onDeleteClicked(employee)}
                                        className="h-8 px-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                        <CiTrash className="h-4 w-4" />
                                    </Button>
                                </div>)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {data.meta && data.meta.totalPages > 1 && (
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
                    />
                </div>
            )}

            {/* Confirmation modals */}
            {confirmationPut && (
                <DialogModalForm modal={confirmationPut} />
            )}
            {confirmationSectionCreate && (
                <DialogModalForm modal={confirmationSectionCreate} />
            )}
        </div>
    );
};

export default CardDetailsEmployee;