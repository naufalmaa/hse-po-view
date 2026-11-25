import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useAppTranslation, AppTranslation } from "@/lib/i18n-typed";
import { DataTablePagination } from "@/components/custom/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getShortName, getDaysFromCurrentDate } from "@/lib/my-utils";
import { Button } from "@/components/ui/button";
import { CiEdit, CiTrash } from "react-icons/ci";
import { getStatusDateFromObject } from "@/lib/app-utils";
import FormCertificate from "@/components/pages/employee/detail/FormCertificate";
import FormSika from "@/components/pages/employee/detail/FormSika";
import FormGeneral from "@/components/pages/employee/detail/FormGeneral";
import { onDataUpdated as onDataUpdatedEmployee } from "@/components/pages/employee/detail/template/employee";
import { DialogModalForm } from "@/components/custom/components";
import { onCertificateDataCreated, onCertificateDataUpdated } from "@/components/pages/employee/detail/template/certificate";
import { onSikaDataCreated, onSikaDataUpdated } from "@/components/pages/employee/detail/template/sika";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CiCirclePlus } from "react-icons/ci";
import { getEmployeeColor, getEmployeeLabel } from "@/constants/app-enum";
import { LuClock } from "react-icons/lu";
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

// BadgeStatus component - extracted from TableEmployee.tsx
const BadgeStatus = ({
    status,
    keyStatus = "value",
    icon,
    handleCreateItem,
    handleEditItem,
    enableAction = true,
    t
}: {
    status: any;
    keyStatus?: string;
    icon?: React.ReactNode;
    handleCreateItem?: () => void;
    handleEditItem?: () => void;
    enableAction?: boolean;
    t: AppTranslation;
}) => {
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
                className={`
          ${status.styles} 
        `}
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
                        className={`
              ${status.styles} 
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

const CardStatusEmployee = ({
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
    const [confirmationSectionCreate, setConfirmationSectionCreate] = React.useState<any | null>(null);

    // Get supporting files for a specific contract item
    const getItemSupportingFiles = (supportingFiles: any[], rowId: string, itemId: string) => {
        return supportingFiles?.filter((file: any) => file?.[rowId] === itemId) ?? [];
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.data?.map((employee: any, index: number) => {
                    // Get certificate and sika data for this employee
                    const certificates = employee?.certificates ?? [];
                    const sika = employee?.sika ?? [];

                    // Get last update badge info
                    const lastUpdateInfo = getDaysFromCurrentDate(t, employee.updatedAt);

                    // Get BST status
                    const bstCertificates = certificates.filter((cert: EmployeeCertificate) => cert.aliases?.toLowerCase().includes("bst") ?? false);
                    const bstStatus = getStatusDateFromObject(bstCertificates);

                    // Get First Aider status
                    const firstAiderCertificates = certificates.filter((cert: any) => cert.name.toLowerCase().includes("first aider"));
                    const firstAiderStatus = getStatusDateFromObject(firstAiderCertificates);

                    // Get Fire Fighting status
                    const fireFightingCertificates = certificates.filter((cert: any) => cert.name.toLowerCase().includes("fire fighting"));
                    const fireFightingStatus = getStatusDateFromObject(fireFightingCertificates);

                    // Get Sika Awareness status
                    const sikaAwarenessItems = sika.filter((item: any) => item?.type?.toLowerCase().includes("sika awareness"));
                    const sikaAwarenessStatus = getStatusDateFromObject(sikaAwarenessItems);

                    // Get Sika Certificate status
                    const sikaCertificateItems = sika.filter((item: any) => item?.type?.toLowerCase().includes("sika certificate"));
                    const sikaCertificateStatus = getStatusDateFromObject(sikaCertificateItems);

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

                            {/* Status badges grid */}
                            <div className="space-y-2">
                                {/* BST Status */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.bst)}</span>
                                    <BadgeStatus
                                        t={t}
                                        enableAction={enableAction}
                                        icon={<span className={"text-sm"}>{bstStatus.icon && <bstStatus.icon />}</span>}
                                        keyStatus="status"
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

                                {/* First Aider Status */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.firstAider)}</span>
                                    <BadgeStatus
                                        t={t}
                                        enableAction={enableAction}
                                        icon={<span className={"text-sm"}>{firstAiderStatus.icon && <firstAiderStatus.icon />}</span>}
                                        keyStatus="status"
                                        status={firstAiderStatus}
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
                                            const itemFiles = getItemSupportingFiles(employee?.files, "certificateId", firstAiderStatus.item?.id);
                                            onCertificateDataUpdated(
                                                t,
                                                employee.id,
                                                firstAiderStatus.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormCertificate files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                {/* Fire Fighting Status */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.fireFighting)}</span>
                                    <BadgeStatus
                                        t={t}
                                        enableAction={enableAction}
                                        icon={<span className={"text-sm"}>{fireFightingStatus.icon && <fireFightingStatus.icon />}</span>}
                                        keyStatus="status"
                                        status={fireFightingStatus}
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
                                            const itemFiles = getItemSupportingFiles(employee?.files, "certificateId", fireFightingStatus.item?.id);
                                            onCertificateDataUpdated(
                                                t,
                                                employee.id,
                                                fireFightingStatus.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormCertificate files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                {/* Sika Awareness Status */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.sikaAwareness)}</span>
                                    <BadgeStatus
                                        t={t}
                                        enableAction={enableAction}
                                        icon={<span className={"text-sm"}>{sikaAwarenessStatus.icon && <sikaAwarenessStatus.icon />}</span>}
                                        keyStatus="status"
                                        status={sikaAwarenessStatus}
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
                                            const itemFiles = getItemSupportingFiles(employee?.files, "sikaId", sikaAwarenessStatus.item?.id);
                                            onSikaDataUpdated(
                                                t,
                                                employee.id,
                                                sikaAwarenessStatus.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormSika files={itemFiles} />
                                            )
                                        }}
                                    />
                                </div>

                                {/* Sika Certificate Status */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{t($ => $.employeeList.table.sikaCertificate)}</span>
                                    <BadgeStatus
                                        t={t}
                                        enableAction={enableAction}
                                        icon={<span className={"text-sm"}>{sikaCertificateStatus.icon && <sikaCertificateStatus.icon />}</span>}
                                        keyStatus="status"
                                        status={sikaCertificateStatus}
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
                                            const itemFiles = getItemSupportingFiles(employee?.files, "sikaId", sikaCertificateStatus.item?.id);
                                            onSikaDataUpdated(
                                                t,
                                                employee.id,
                                                sikaCertificateStatus.item,
                                                setConfirmationSectionCreate,
                                                onEmployeeUpdated,
                                                <FormSika files={itemFiles} />
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
            {data?.meta && data?.meta?.totalPages > 1 && (
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

export default CardStatusEmployee;