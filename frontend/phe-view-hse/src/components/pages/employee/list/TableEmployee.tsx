import { DataTable, useDataTable } from "@/components/custom/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CiTrash, CiEdit, CiCirclePlus } from "react-icons/ci";
import { FaShip, FaBriefcase } from "react-icons/fa";
import { MdCheckCircle, MdInfo, MdWarningAmber } from "react-icons/md";
import { getDaysFromCurrentDate, getShortName } from "@/lib/my-utils";
import { useAppTranslation } from "@/lib/i18n-typed";
import { getEmployeeColor, getEmployeeLabel } from "@/constants/app-enum";
import { getStatusDateFromObject } from "@/lib/app-utils";
import { createRowNumberColumn } from "@/components/custom/table/data-table";
import { DialogModalForm, ModalFormProps } from "@/components/custom/components";
import React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  FormGeneral,
  FormContract, onContractDataCreated, onContractDataUpdated,
  FormMcu, onMcuDataCreated, onMcuDataUpdated,
  FormVaccine, onVaccinationDataCreated, onVaccinationDataUpdated,
  FormSika, onSikaDataCreated, onSikaDataUpdated,
  FormCertificate, onCertificateDataCreated, onCertificateDataUpdated,
  FormBpjs, onBpjsDataCreated, onBpjsDataUpdated
} from "../detail";
import { onDataUpdated as onDataUpdatedEmployee } from "../detail/template/employee";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Employee, EmployeeCertificate, EmployeeListResponse } from "@/service/employee/employee-list";
import { openStatusChangeDialog } from "./DialogStatusChange";

type Props = {
  data: EmployeeListResponse;
  viewMode?: string;
  onDetailClicked?: (id: string) => void;
  onDeleteClicked?: (item: Employee) => void;
  onPaginationChange?: (paginationData: { page: number; limit: number }) => void;
  paginationData: {
    page: number; // Current page (1-based)
    view: number;
    limit: number; // Page size
    total: number; // Total row count
    totalPages: number; // Total pages
  };
  onEmployeeUpdated: (employeeId: string, body: Record<string, any>) => void;
  formData?: any; // Add formData prop to pass subcontractor options
  enableAction?: boolean;
  isAdmin?: boolean;
  userRole?: string;
  onManageAttendance?: (body: any) => void;
}


const TableReport = ({
  data,
  viewMode = 'tableSimple',
  onDetailClicked,
  onDeleteClicked,
  onPaginationChange,
  paginationData,
  onEmployeeUpdated,
  formData, // Destructure formData prop
  enableAction = true,
  isAdmin = false,
  userRole,
  onManageAttendance
}: Props) => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [confirmationPut, setConfirmationPut] = React.useState<ModalFormProps | null>(null);
  const [confirmationSectionCreate, setConfirmationSectionCreate] = React.useState<ModalFormProps | null>(null);

  const BadgeStatus = ({ status, keyStatus = "value", icon, handleCreateItem, handleEditItem }: any) => {
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

  const columnName = {
    accessorKey: "employeeName",
    header: t($ => $.employeeList.table.name),
    enableSorting: true,
    size: 270,
    minSize: 270,
    cell: ({ cell, row }: any) => {
      const name = cell.getValue() ?? "";
      const shortName = getShortName(name);
      return <div className={"flex flex-row gap-2 items-center"}>
        <Avatar>
          <AvatarImage src={row.original?.imageUrl} />
          <AvatarFallback className={"bg-secondary"}>{shortName}</AvatarFallback>
        </Avatar>
        <div className={""}>
          <div onClick={() => onDetailClicked?.(row.original?.id)} className={"cursor-pointer hover:underline"}>{name}</div>
          <div className={"text-sm text-muted-foreground"}>{row.original?.subContractorName}</div>
        </div>
      </div>
    }
  };

  const columnVesselName = {
    accessorKey: "vesselName",
    header: t($ => $.employeeList.table.vesselName),
    enableSorting: true,
    size: 150,
    minSize: 150,
    cell: ({ cell }: any) => {
      return <div className={""}>{cell.getValue()}</div>
    }
  };

  const columnVesselOrProject = {
    accessorKey: "vesselOrProject",
    header: t($ => $.employeeList.table.vesselOrProject),
    enableSorting: true,
    size: 150,
    minSize: 150,
    cell: ({ row }: any) => {
      const vesselName = row.original?.vesselName;
      const projectName = row.original?.projectName;
      return (
        <div className="flex flex-col gap-1">
          {vesselName && (
            <div className="flex flex-row items-center gap-2">
              <FaShip size={12} className="shrink-0" />
              <span className="">{vesselName}</span>
            </div>
          )}
          {projectName && (
            <div className="flex flex-row items-center gap-2">
              <FaBriefcase size={12} className="shrink-0" />
              <span className="">{projectName}</span>
            </div>
          )}
        </div>
      )
    }
  };

  const columnAction = {
    accessorKey: "action",
    header: t($ => $.employeeList.table.action),
    enableSorting: false,
    size: 40,
    cell: ({ row }: any) => {
      return <div className={"flex flex-row gap-1"}>
        <Button variant="ghost" size={"icon"} onClick={() => onDataUpdatedEmployee(row.original?.id, row.original, <FormGeneral isFormCreate={false} />, setConfirmationPut, onEmployeeUpdated, formData, t)}><CiEdit /></Button>
        <Button variant="ghost" size={"icon"} onClick={() => onDeleteClicked?.(row.original)} className={"text-destructive"}><CiTrash /></Button>
      </div>
    }
  };

  const daysOnBoard = {
    accessorKey: "daysOnBoard",
    header: t($ => $.employeeList.table.daysOnBoard),
    enableSorting: true,
    size: 100,
    minSize: 100,
    maxSize: 100,
    cell: ({ cell }: any) => {
      return <div className={"text-center"}>{cell.getValue()}</div>
    }
  }

  const columnStatusOnDuty = {
    accessorKey: "statusOnDuty",
    header: t($ => $.employeeList.table.status),
    enableSorting: true,
    size: 100,
    cell: ({ cell, row }: any) => {
      const value = cell.getValue();
      const color = value ? "bg-green-500" : "bg-red-500";
      const isContractor = userRole === 'contractor';
      const canClick = isAdmin || isContractor;
      return (
        <Badge
          variant={"outline"}
          className={canClick ? "cursor-pointer hover:bg-accent" : ""}
          {...(canClick ? {
            onClick: () => {
              const employeeId = row.original?.id;
              if (employeeId) {
                if (isContractor && onManageAttendance) {
                  openStatusChangeDialog(t, employeeId, value, setConfirmationPut, onManageAttendance);
                } else if (isAdmin) {
                  navigate({ to: `/employee/attendance/${employeeId}` as any });
                }
              }
            }
          } : {})}
        >
          <span className={`w-2 h-2 rounded-full ${color}`} />
          {value ? t($ => $.employeeList.status.onDuty) : t($ => $.employeeList.status.off)}
        </Badge>
      );
    }
  };

  const columnUpdatedAt = {
    accessorKey: "updatedAt",
    header: t($ => $.employeeList.table.lastUpdate),
    enableSorting: true,
    size: 100,
    cell: ({ cell }: any) => {
      const value = cell.getValue();
      const item = getDaysFromCurrentDate(t, value);
      return <Badge className={`${item.style}`}>{item.labels}</Badge>
    }
  };

  const columnIdentityNumber = {
    accessorKey: "identityNumber",
    header: t($ => $.employeeList.table.dateOfBirthId),
    enableSorting: false,
    size: 100,
    cell: ({ row }: any) => {
      return (<div className={"text-sm"}>
        <div>{row.original?.dateOfBirth || "-"}</div>
        <div className={"text-muted-foreground"}>{row.original?.identityNumber}</div>
      </div>)
    }
  };
  const columnCategory = {
    accessorKey: "category",
    header: t($ => $.employeeList.table.category),
    enableSorting: true,
    size: 100,
    cell: ({ cell }: any) => {
      const value = cell.getValue();
      const color = getEmployeeColor(value);
      const label = getEmployeeLabel(value);
      return <Badge variant={"outline"}><span className={`w-2 h-2 rounded-full ${color}`}></span> {label}</Badge>
    }
  };
  const columnPosition = {
    accessorKey: "position",
    header: t($ => $.employeeList.table.position),
    enableSorting: true,
    size: 150,
    minSize: 150
  };

  const columnBpjs = {
    accessorKey: "bpjs",
    header: t($ => $.employeeList.table.bpjs),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.bpjs ?? [];
      const status = getStatusDateFromObject(rows);
      
      const hasEmployment = rows.some((r: any) => r.bpjsEmployment && r.bpjsEmployment !== "");
      const hasHealth = rows.some((r: any) => r.bpjsHealth && r.bpjsHealth !== "");
      
      let displayValue = t($ => $.employeeList.status.missing);
      if (hasEmployment && hasHealth) {
        displayValue = "Lengkap (TK & KES)";
      } else if (hasEmployment) {
        displayValue = "Ketenagakerjaan";
      } else if (hasHealth) {
        displayValue = "Kesehatan";
      }
      
      // Override status value for BPJS
      const displayStatus = {
        ...status,
        status: (hasEmployment || hasHealth) ? "active" : "missing",
        value: displayValue,
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

      const itemFiles = getItemSupportingFiles(row.original?.files, "bpjsId", status.item?.id);

      return (
        <BadgeStatus
          status={displayStatus}
          handleCreateItem={() => {
            onBpjsDataCreated(
              t,
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormBpjs />
            )
          }}
          handleEditItem={() => {
            onBpjsDataUpdated(
              t,
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormBpjs files={itemFiles} />
            )
          }}
        />
      )
    }
  }

  const columnBss = {
    accessorKey: "bss",
    header: t($ => $.employeeList.table.bss),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.certificates ?? [];
      const rows_ = rows.filter((cert: EmployeeCertificate) => cert.aliases?.toLowerCase().includes("bss") ?? false);
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "certificateId", status.item?.id);

      return (
        <BadgeStatus
          icon={<span className={"text-sm"}><status.icon /></span>}
          status={status}
          handleCreateItem={() => {
            onCertificateDataCreated(
              t,
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate />
            )
          }}
          handleEditItem={() => {
            onCertificateDataUpdated(
              t,
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate files={itemFiles} />
            )
          }}
        />
      )
    }
  }
  const columnLocation = {
    accessorKey: "location",
    header: t($ => $.employeeList.table.bargeLocation),
    enableSorting: true,
    size: 150,
    minSize: 150
  };

  const columnBst = {
    accessorKey: "bst",
    header: t($ => $.employeeList.table.bst),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.certificates ?? [];
      const rows_ = rows.filter((cert: EmployeeCertificate) => cert.aliases?.toLowerCase().includes("bst") ?? false);
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "certificateId", status.item?.id);

      return (
        <BadgeStatus
          icon={<span className={"text-sm"}><status.icon /></span>}
          status={status}
          handleCreateItem={() => {
            onCertificateDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate />
            )
          }}
          handleEditItem={() => {
            onCertificateDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate files={itemFiles} />
            )
          }}
        />
      )
    }
  }
  const columnFirstAider = {
    accessorKey: "firstAider",
    header: t($ => $.employeeList.table.firstAider),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.certificates ?? [];
      const rows_ = rows.filter((cert: Record<string, any>) => cert.name.toLowerCase().includes("first aider"));
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "certificateId", status.item?.id);
      return (
        <BadgeStatus
          icon={<span className={"text-sm"}><status.icon /></span>}
          status={status}
          handleCreateItem={() => {
            onCertificateDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate />
            )
          }}
          handleEditItem={() => {
            onCertificateDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate files={itemFiles} />
            )
          }}
        />
      )
    }
  }
  const columnFireFighting = {
    accessorKey: "fireFighting",
    header: t($ => $.employeeList.table.fireFighting),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.certificates ?? [];
      const rows_ = rows.filter((cert: Record<string, any>) => cert.name.toLowerCase().includes("fire fighting"));
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "certificateId", status.item?.id);

      return (
        <BadgeStatus
          icon={<span className={"text-sm"}><status.icon /></span>}
          status={status}
          handleCreateItem={() => {
            onCertificateDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate />
            )
          }}
          handleEditItem={() => {
            onCertificateDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate files={itemFiles} />
            )
          }}
        />
      )
    }
  }

  const columnSikaAwareness = {
    accessorKey: "sikaAwareness",
    header: t($ => $.employeeList.table.sikaAwareness),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.sika ?? [];
      const rows_ = rows.filter((cert: Record<string, any>) => cert?.type?.toLowerCase().includes("sika awareness"));
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "sikaId", status.item?.id);

      return (
        <BadgeStatus
          icon={<span className={"text-sm"}><status.icon /></span>}
          status={status}
          handleCreateItem={() => {
            onSikaDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormSika />
            )
          }}
          handleEditItem={() => {
            onSikaDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormSika files={itemFiles} />
            )
          }}
        />
      )
    }
  }

  const columnSikaCertificate = {
    accessorKey: "sikaCertificate",
    header: t($ => $.employeeList.table.sikaCertificate),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.sika ?? [];
      const rows_ = rows.filter((cert: Record<string, any>) => cert?.type?.toLowerCase().includes("sika certificate"));
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "sikaId", status.item?.id);

      return (
        <BadgeStatus
          icon={<span className={"text-sm"}><status.icon /></span>}
          status={status}
          handleCreateItem={() => {
            onSikaDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormSika />
            )
          }}
          handleEditItem={() => {
            onSikaDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormSika files={itemFiles} />
            )
          }}
        />
      )
    }
  }

  // Get supporting files for a specific contract item
  const getItemSupportingFiles = (supportingFiles: any[], rowId: string, itemId: string) => {
    return supportingFiles?.filter((file: any) => file?.[rowId] === itemId) ?? [];
  };

  const columnContractExpiredDate = {
    accessorKey: "contractExpiredDate",
    header: t($ => $.employeeList.table.contractExpiredDate),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.contracts ?? [];
      const status = getStatusDateFromObject(rows);
      const itemFiles = getItemSupportingFiles(row.original?.files, "contractId", status.item?.id);

      return (
        <BadgeStatus
          status={status}
          handleCreateItem={() => {
            onContractDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormContract />
            )
          }}
          handleEditItem={() => {
            onContractDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormContract files={itemFiles} />
            )
          }}
        />
      )
    }
  }
  const columnMcuExpiredDate = {
    accessorKey: "mcuExpiredDate",
    header: t($ => $.employeeList.table.mcuExpiredDate),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.mcus ?? [];
      const status = getStatusDateFromObject(rows, "mcuExpiredDate");
      const itemFiles = getItemSupportingFiles(row.original?.files, "mcuId", status.item?.id);
      return (
        <BadgeStatus
          status={status}
          handleCreateItem={() => {
            onMcuDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormMcu />
            )
          }}
          handleEditItem={() => {
            onMcuDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormMcu files={itemFiles} />
            )
          }}
        />
      )
    }
  }

  const columnVaccinationsExpiredDate = {
    accessorKey: "vaccinationsExpiredDate",
    header: t($ => $.employeeList.table.vaccinationsExpiredDate),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.vaccinations ?? [];
      const status = getStatusDateFromObject(rows, "vaccineDate", true);
      const itemFiles = getItemSupportingFiles(row.original?.files, "vaccinationId", status.item?.id);

      return (
        <BadgeStatus
          status={status}
          handleCreateItem={() => {
            onVaccinationDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormVaccine />
            )
          }}
          handleEditItem={() => {
            onVaccinationDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormVaccine files={itemFiles} />
            )
          }}
        />
      )
    }
  }

  const columnSikaExpiredDate = {
    accessorKey: "sikaExpiredDate",
    header: t($ => $.employeeList.table.sikaExpiredDate),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.sika ?? [];
      const status = getStatusDateFromObject(rows);
      const itemFiles = getItemSupportingFiles(row.original?.files, "sikaId", status.item?.id);

      return (
        <BadgeStatus
          status={status}
          handleCreateItem={() => {
            onSikaDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormSika />
            )
          }}
          handleEditItem={() => {
            onSikaDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormSika files={itemFiles} />
            )
          }}
        />
      )
    }
  }
  const columnBssExpiredDate = {
    accessorKey: "bssExpiredDate",
    header: t($ => $.employeeList.table.bssExpiredDate),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.certificates ?? [];
      const rows_ = rows.filter((cert: EmployeeCertificate) => cert.aliases?.toLowerCase().includes("bss") ?? false);
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "certificateId", status.item?.id);

      return (
        <BadgeStatus
          status={status}
          handleCreateItem={() => {
            onCertificateDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate />
            )
          }}
          handleEditItem={() => {
            onCertificateDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate files={itemFiles} />
            )
          }}
        />
      )
    }
  }
  const columnBstExpiredDate = {
    accessorKey: "bstExpiredDate",
    header: t($ => $.employeeList.table.bstExpiredDate),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.certificates ?? [];
      const rows_ = rows.filter((cert: EmployeeCertificate) => cert.aliases?.toLowerCase().includes("bst") ?? false);
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "certificateId", status.item?.id);

      return (
        <BadgeStatus
          status={status}
          handleCreateItem={() => {
            onCertificateDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate />
            )
          }}
          handleEditItem={() => {
            onCertificateDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate files={itemFiles} />
            )
          }}
        />
      )
    }
  }
  const columnCertificateExpiredDate = {
    accessorKey: "certificateExpiredDate",
    header: t($ => $.employeeList.table.certificateExpiredDate),
    enableSorting: false,
    cell: ({ row }: any) => {
      const rows = row.original?.certificates ?? [];
      const rows_ = rows.filter((cert: EmployeeCertificate) => {
        const nameCheck = !cert.name.toLowerCase().includes("bss") && !cert.name.toLowerCase().includes("bst");
        const aliasCheck = !(cert.aliases?.toLowerCase().includes("bss") ?? false) && !(cert.aliases?.toLowerCase().includes("bst") ?? false);
        return nameCheck && aliasCheck;
      });
      const status = getStatusDateFromObject(rows_);
      const itemFiles = getItemSupportingFiles(row.original?.files, "certificateId", status.item?.id);

      return (
        <BadgeStatus
          status={status}
          handleCreateItem={() => {
            onCertificateDataCreated(
              t, // Add translation function
              row.original?.id,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate />
            )
          }}
          handleEditItem={() => {
            onCertificateDataUpdated(
              t, // Add translation function
              row.original?.id,
              status.item,
              setConfirmationSectionCreate,
              onEmployeeUpdated,
              <FormCertificate files={itemFiles} />
            )
          }}
        />
      )
    }
  }

  const columnHsseEPassportNumber = {
    accessorKey: 'hssePassportNumber',
    header: t($ => $.employeeList.table.hsseEPassport)
  }

  const getColumnViewMode = () => {
    if (viewMode === "tableSimple") {
      const columns = [
        createRowNumberColumn<Employee>({ accessorKey: "rowNum", id: "rowNum", paginationData: paginationData }),
        columnUpdatedAt, columnStatusOnDuty, daysOnBoard, columnName, columnIdentityNumber, columnHsseEPassportNumber, columnCategory, columnVesselOrProject,
        columnPosition, columnLocation
      ];
      if (enableAction) {
        columns.push(columnAction);
      }
      return columns;
    }
    if (viewMode === "tableDetails") {
      const columns = [
        createRowNumberColumn<Employee>({ accessorKey: "rowNum", id: "rowNum", paginationData: paginationData }),
        columnUpdatedAt, columnStatusOnDuty, daysOnBoard, columnName,
        columnIdentityNumber, columnHsseEPassportNumber, columnCategory, columnVesselOrProject, columnPosition, columnLocation,
        columnContractExpiredDate, columnMcuExpiredDate, columnVaccinationsExpiredDate, columnSikaExpiredDate,
        columnBssExpiredDate, columnBstExpiredDate, columnCertificateExpiredDate
      ];
      if (enableAction) {
        columns.push(columnAction);
      }
      return columns;
    }
    if (viewMode === "tableStatus") {
      const columns = [
        createRowNumberColumn<Employee>({ accessorKey: "rowNum", id: "rowNum", paginationData: paginationData }),
        columnName,
        columnContractExpiredDate,
        columnBpjs,
        columnVaccinationsExpiredDate,
        columnMcuExpiredDate,
        columnBst,
        columnBss,
        columnSikaExpiredDate,
        columnCertificateExpiredDate,
      ];
      if (enableAction) {
        columns.push(columnAction);
      }
      return columns;
    }

    // Default fallback - same as tableSimple
    const columns = [
      createRowNumberColumn<Employee>({ accessorKey: "rowNum", id: "rowNum", paginationData: paginationData }),
      columnUpdatedAt, columnStatusOnDuty, columnName, columnVesselName, columnIdentityNumber, columnCategory,
      columnPosition
    ];
    if (enableAction) {
      columns.push(columnAction);
    }
    return columns;
  }

  const { table } = useDataTable({
    data: data?.data || [],
    columns: getColumnViewMode(),
    pageCount: paginationData.totalPages || -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["action"] },
      pagination: { pageIndex: paginationData.page - 1, pageSize: paginationData.limit },
    },
    manualSorting: false,
    manualPagination: true,
    onPaginationChange: (updater: any) => {
      const nextPagination = typeof updater === "function" ? updater(table.getState().pagination) : updater;

      // Call parent pagination handler if provided
      if (onPaginationChange) {
        onPaginationChange({
          page: nextPagination.pageIndex + 1, // Convert 0-based to 1-based
          limit: nextPagination.pageSize,
        });
      }
    },
    manualFiltering: false,
  });

  return (
    <div className="p-2 w-full h-full overflow-hidden">
      {data && <DataTable
        table={table}
        totalRowCount={paginationData.total ?? 0}
        paginationData={paginationData}
        className="border-0"
      >
        {/* <div className="flex flex-row gap-2 justify-end p-4 bg-card/50">
          <div className="flex flex-row gap-2">
            <DataTableViewOptions table={table} />
          </div>
        </div> */}
      </DataTable>
      }

      {confirmationPut && <DialogModalForm modal={confirmationPut} />}
      {confirmationSectionCreate && <DialogModalForm modal={confirmationSectionCreate} />}
      {/* {confirmationSectionPut && <DialogModalForm modal={confirmationSectionPut}/>} */}
    </div>
  );
};

export default TableReport;