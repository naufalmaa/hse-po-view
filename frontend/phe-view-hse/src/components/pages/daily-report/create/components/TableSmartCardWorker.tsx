import { Button } from "@/components/ui/button";
import { DataTable, useDataTable } from "@/components/custom/table";
import React, { useCallback, useEffect, useMemo } from "react";
import { CiEdit, CiTrash } from "react-icons/ci";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FormParticipant from "@/components/pages/daily-report/create/components/FormParticipant";
import { FiUserPlus } from "react-icons/fi";
import { createRowNumberColumn } from "@/components/custom/table/data-table";

type Props = {
  data: any[],
  onDataUpdated: (data: Record<any, any>[]) => void
}

const TableSmartCardWorker = ({ data, onDataUpdated }: Props) => {
  const [tableData, setTableData] = React.useState(data);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  const onEditClicked = useCallback((item: any, index: number) => {
    const newData = tableData.map((data, i) => i === index ? item : data);
    setTableData(newData);
    onDataUpdated(newData);
  }, [tableData]);

  const onDeleteClicked = useCallback((event: React.MouseEvent<HTMLButtonElement, MouseEvent>, index: number) => {
    event.preventDefault();
    const newData = tableData.filter((_, i) => i !== index);

    setTableData(newData);
    onDataUpdated(newData);
  }, [tableData, onDataUpdated]);

  const onCreateClicked = (item: any) => {
    const newData = [...tableData, item];

    setTableData(newData);
    onDataUpdated(newData);
    setCreateModalOpen(false);
  }

  const columns = useMemo(() => [
    createRowNumberColumn({ accessorKey: "rowNum", id: "rowNum" }),
    {
      accessorKey: "name",
      header: "NAMA",
      enableSorting: true,
    },
    {
      accessorKey: "company",
      header: "PERUSAHAAN",
      enableSorting: true,
    },
    // {
    //   accessorKey: "action",
    //   header: "ACTION",
    //   enableSorting: false,
    //   size: 40,
    //   cell: ({ row }: any) => {
    //     const [editModalOpen, setEditModalOpen] = React.useState(false);

    //     return <div className={"flex flex-row gap-1"}>
    //       <Popover open={editModalOpen} onOpenChange={setEditModalOpen}>
    //         <PopoverTrigger asChild>
    //           <Button size={"icon"} variant={"outline"} className={"w-7 h-7 text-primary"} ><CiEdit /></Button>
    //         </PopoverTrigger>
    //         <PopoverContent className="w-80">
    //           <FormParticipant onSubmitClicked={(item: any) => onEditClicked(item, row.index)}
    //             title={"Edit Participant"}
    //             defaultValues={{ name: row?.original.name, company: row?.original.company }} />
    //         </PopoverContent>
    //       </Popover>
    //       <Button size={"icon"} variant={"outline"} className={"w-7 h-7 text-destructive"}
    //         onClick={(event: React.MouseEvent<HTMLButtonElement>) => onDeleteClicked(event, row.index)}><CiTrash /></Button>
    //     </div>
    //   }
    // },
  ], [onEditClicked, onDeleteClicked]);

  const { table } = useDataTable({
    data: tableData || [],
    columns,
    pageCount: -1,
    initialState: {
      columnPinning: { left: ["rowNum"], right: ["action"] },
      pagination: { pageIndex: 0, pageSize: 10 }, // Convert 1-based to 0-based
    },
    manualSorting: false,
    manualPagination: false,
    manualFiltering: false,
  });

  return (
    <div className={"mt-2"}>
      <DataTable
        table={table}
        totalRowCount={data?.length ?? 0}
      >
        <div>
          {/* <Popover open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <PopoverTrigger asChild>
              <Button variant={"outline"}><FiUserPlus /> Add Participant</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <FormParticipant onSubmitClicked={onCreateClicked}
                title={"Add Participant"}
                defaultValues={{ name: "", company: "" }} />
            </PopoverContent>
          </Popover> */}
        </div>
      </DataTable>
    </div>
  )
}
export default TableSmartCardWorker