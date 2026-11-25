import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload";
import {
  AlertCircleIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileIcon, FileSpreadsheetIcon,
  FileTextIcon, HeadphonesIcon, ImageIcon,
  Trash2Icon,
  PlusIcon,
  UploadIcon, VideoIcon, FilePenLineIcon
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FormAssetNote from "./FormAssetNote";

const getFileIcon = (file: { file: File | { type: string; name: string } }) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type
  const fileName = file.file instanceof File ? file.file.name : file.file.name

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />
  } else if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />
  } else if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />
  } else if (fileType.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />
  } else if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />
  } else if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />
  }
  return <FileIcon className="size-4 opacity-60" />
}

type Props = {
  maxFiles?: number,
  maxSize?: number,
  totalMaxSize?: number,
  onFileChanged?: (data: Record<any, any>[]) => void
  clearFileList?: boolean,
  fileTypeMaxCharacters?: number,
  initialFiles?: any[],
  actionButtons?: React.ReactNode,
}

const ContainerUpload = ({
  maxFiles = 25, maxSize = 100 * 1024 * 1024, totalMaxSize = 100 * 1024 * 1024, onFileChanged, clearFileList,
  fileTypeMaxCharacters = 32, initialFiles = [], actionButtons
}: Props) => {
  const [
    { files, isDragging, errors },
    {
      addFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: true,
    maxFiles,
    maxSize,
    totalMaxSize,
    // Don't pass initialFiles here, we'll handle it manually with addFiles
  })

  const [fileNotes, setFileNotes] = React.useState<Record<string, string>>({});
  const [initialFilesProcessed, setInitialFilesProcessed] = React.useState(false);

  // Handle initialFiles using addFiles method
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !initialFilesProcessed) {
      // Convert FileMetadata to File objects for addFiles
      const fileObjects = initialFiles.map((fileData: any) => {
        // If it's already a FileWithPreview object, extract the actual file
        if (fileData.file && fileData.file instanceof File) {
          return fileData.file;
        }
        // If it's FileMetadata, create a mock File object
        // Note: This creates a minimal File-like object for display purposes
        const mockFile = new File([], fileData.name || fileData.file?.name, {
          type: fileData.type || fileData.file?.type || 'application/octet-stream'
        });
        // Add metadata properties to the mock file
        Object.defineProperty(mockFile, 'size', {
          value: fileData.size || fileData.file?.size || 0,
          writable: false
        });
        return mockFile;
      });

      addFiles(fileObjects);
      setInitialFilesProcessed(true);
    }
  }, [initialFiles, addFiles, initialFilesProcessed]);

  // Reset processed flag when initialFiles changes
  useEffect(() => {
    setInitialFilesProcessed(false);
  }, [initialFiles]);

  useEffect(() => {
    if (clearFileList && files.length > 0) {
      clearFiles();
    }
  }, [clearFileList, files.length]);

  useEffect(() => {
    if (onFileChanged && files.length > 0) {
      const data = files.map((f: any) => {
        return ({
          id: f.id,
          name: f.file.name,
          file: f,
          notes: fileNotes[f.id] ?? "",
        })
      }
      );
      onFileChanged(data);
    }
  }, [files, onFileChanged, fileNotes]);

  const FileRow = ({ file, fileNotes, setFileNotes, removeFile }: any) => {
    const [editModalOpen, setEditModalOpen] = useState(false);

    return (
      <TableRow key={file.id}>
        <TableCell className="max-w-48 py-2 font-medium">
          <span className="flex items-center gap-2">
            <span className="shrink-0">{getFileIcon(file)}</span>{" "}
            <div className={"flex flex-col gap-0 truncate"}>
              <span className="truncate">{file.file.name}</span>
              <span className="truncate text-muted-foreground text-xs"><span
                className={"font-bold"}>Note:</span> {fileNotes?.[file.id] ?? ""}</span>
            </div>
          </span>
        </TableCell>
        <TableCell className="text-muted-foreground py-2">
          {file.file.type.split("/")[1] ?
            (file.file.type.split("/")[1].length > fileTypeMaxCharacters
              ? `${file.file.type.split("/")[1].substring(0, fileTypeMaxCharacters).toUpperCase()}...`
              : file.file.type.split("/")[1].toUpperCase())
            : "UNKNOWN"}
        </TableCell>
        <TableCell className="text-muted-foreground py-2">
          {formatBytes(file.file.size)}
        </TableCell>
        <TableCell className="py-2 text-right whitespace-nowrap">
          <Popover open={editModalOpen} onOpenChange={setEditModalOpen}>
            <PopoverTrigger asChild>
              <Button size={"icon"} variant={"ghost"}
                className="text-muted-foreground/80 hover:text-foreground size-8 hover:bg-transparent"><FilePenLineIcon /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <FormAssetNote onSubmitClicked={(item: any) => {
                setFileNotes((prev: any) => ({
                  ...prev,
                  [file.id]: fileNotes?.[file.id] || (item?.notes ?? ""),
                }))
                setEditModalOpen(false);
              }}
                title={"Edit Notes"}
                defaultValues={{ notes: fileNotes?.[file?.id] }} />
            </PopoverContent>
          </Popover>
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground/80 hover:text-foreground size-8 hover:bg-transparent"
            aria-label={`Download ${file.file.name}`}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              window.open(file.preview, "_blank");
            }}
          >
            <DownloadIcon className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground/80 hover:text-foreground size-8 hover:bg-transparent"
            aria-label={`Remove ${file.file.name}`}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              removeFile(file.id)
            }}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="flex flex-col gap-2 bg-card rounded-xl">
      {/* Drop area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        data-files={files.length > 0 || undefined}
        className="border-input data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 flex min-h-40 flex-col items-center rounded-xl border border-dashed p-4 transition-colors not-data-[files]:justify-center has-[input:focus]:ring-[3px] data-[files]:hidden"
      >
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Upload files"
        />
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            <FileIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 text-sm font-medium">Drag and drop or click to Upload files</p>
          <p className="text-muted-foreground text-xs">
            Max {maxFiles} files ∙ Up to {formatBytes(totalMaxSize)} per batch
          </p>
          <Button variant="outline" className="mt-4" onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            openFileDialog();
          }}>
            <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
            Select files
          </Button>
        </div>
      </div>
      {files.length > 0 && (
        <>
          {/* Table with files */}
          <div className="flex items-center justify-between gap-2 px-2 pt-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Files ({files.length}/{maxFiles})</h3>
              <span className="text-xs text-muted-foreground">
                ∙ Total: {formatBytes(files.reduce((acc, f) => acc + (f.file instanceof File ? f.file.size : (f.file.size || 0)), 0))} / {formatBytes(totalMaxSize)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                openFileDialog();
              }}>
                <PlusIcon
                  className="-ms-0.5 size-3.5 opacity-60"
                  aria-hidden="true"
                />
                Add files
              </Button>
              <Button variant="outline" size="sm" onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                clearFiles()
              }}>
                <Trash2Icon
                  className="-ms-0.5 size-3.5 opacity-60"
                  aria-hidden="true"
                />
                Remove all
              </Button>
              {actionButtons}
            </div>
          </div>
          <div className="bg-background overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="text-xs">
                <TableRow className="bg-muted/50">
                  <TableHead className="h-9 py-2">Name</TableHead>
                  <TableHead className="h-9 py-2">Type</TableHead>
                  <TableHead className="h-9 py-2">Size</TableHead>
                  <TableHead className="h-9 w-0 py-2 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[13px]">
                {files.map((file) => <FileRow key={file.id} file={file} removeFile={removeFile} fileNotes={fileNotes}
                  setFileNotes={setFileNotes} />)}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {errors.length > 0 && (
        <div
          className="text-destructive flex items-center gap-1 text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  )
}
export default ContainerUpload