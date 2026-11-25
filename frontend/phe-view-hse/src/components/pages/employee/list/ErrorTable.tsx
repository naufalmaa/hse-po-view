import * as React from "react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppTranslation } from "@/lib/i18n-typed";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LongText } from "@/components/custom/components/LongText";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ErrorTableProps {
  errors: Array<{
    data?: {
      "Employee Name": string;
      "Company Name": string;
      "Positions": string;
    };
    errors?: string[];
  }>;
  maxRows?: number;
}

export const ErrorTable = ({ errors }: ErrorTableProps) => {
  const { t } = useAppTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(errors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentErrors = errors.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="mt-4 border rounded-md">
      <ScrollArea className="h-[300px] max-w-3xl">
        <div className="min-w-full inline-block align-middle">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">No</TableHead>
                <TableHead>{t($ => $.employeeList.employeeName)}</TableHead>
                <TableHead>{t($ => $.employeeList.subContractor)}</TableHead>
                <TableHead>{t($ => $.employeeList.position)}</TableHead>
                <TableHead>{t($ => $.employeeList.errors)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentErrors.map((error, index) => {
                const errorData = (error.data || {}) as any;
                const errorMessages = error.errors?.length ? error.errors.join(", ") : "Unknown error";
                const rowNumber = startIndex + index + 1;
                const employeeName = errorData["Employee Name"] || "-";
                const subContractor = errorData["Company Name"] || "-";
                const position = errorData["Positions"] || "-";

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{rowNumber}</TableCell>
                    <TableCell>{employeeName}</TableCell>
                    <TableCell>{subContractor}</TableCell>
                    <TableCell>{position}</TableCell>
                    <TableCell>
                      <LongText text={errorMessages} maxChars={100} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {totalPages > 1 && (
        <div className="py-4">
          <Pagination>
            <PaginationContent>
              {/* Previous Button */}
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage((p) => p - 1);
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {/* Page Numbers */}
              {totalPages <= 5 ? (
                // Show all pages if 5 or fewer
                Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))
              ) : (
                // Show condensed pagination for many pages
                <>
                  {/* First page */}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === 1}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(1);
                      }}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>

                  {/* Ellipsis if needed */}
                  {currentPage > 3 && (
                    <PaginationItem>
                      <span className="flex h-9 w-9 items-center justify-center">...</span>
                    </PaginationItem>
                  )}

                  {/* Current page neighborhood */}
                  {currentPage > 1 && currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        isActive={true}
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                      >
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Ellipsis if needed */}
                  {currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <span className="flex h-9 w-9 items-center justify-center">...</span>
                    </PaginationItem>
                  )}

                  {/* Last page */}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === totalPages}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(totalPages);
                      }}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};