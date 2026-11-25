import React from 'react';
import { AlertTriangle, ChevronRight, File as FileIcon, Folder, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContractFolder } from '@/service/csms/folder-detail';
import { formatBytes, getDropConfirmTitle, validateDroppedFiles } from './drop-upload-utils';

export interface DropUploadRequest {
  folder: ContractFolder;
  path: string[]; // folder names from the assessment folder down to the target
  files: File[];
}

interface DropUploadDialogProps {
  request: DropUploadRequest | null;
  onCancel: () => void;
  onConfirm: (request: DropUploadRequest) => void;
}

/** Confirmation after files are dropped on a folder: shows where they go, and blocks or warns about likely mistakes. */
export const DropUploadDialog: React.FC<DropUploadDialogProps> = ({ request, onCancel, onConfirm }) => {
  if (!request) return null;
  const { folder, path, files } = request;
  const children = folder.children ?? [];
  const existingNames = children.filter((c) => c.fileType === 'file').map((c) => c.name);
  const subfolders = children.filter((c) => c.fileType === 'folder').map((c) => c.name);
  const { errors, duplicates } = validateDroppedFiles(files, existingNames);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="leading-snug">{getDropConfirmTitle(files.map((f) => f.name), folder.name)}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-1 text-xs" data-testid="drop-target-path">
              {path.map((name, i) => (
                <React.Fragment key={`${name}-${i}`}>
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  <span className={i === path.length - 1 ? 'font-semibold text-foreground inline-flex items-center gap-1' : ''}>
                    {i === path.length - 1 && <Folder className="h-3 w-3 text-yellow-500" />}
                    {name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">{f.name}</span>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{formatBytes(f.size)}</span>
            </div>
          ))}
        </div>

        {errors.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>{errors.map((e) => <p key={e}>{e}</p>)}</div>
          </div>
        )}
        {subfolders.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-3 py-2 text-sm" data-testid="drop-subfolder-warning">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Folder ini punya sub-folder ({subfolders.join(', ')}). Pastikan berkas tidak seharusnya masuk ke salah satu sub-folder tersebut.</span>
          </div>
        )}
        {duplicates.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Sudah ada berkas dengan nama yang sama di folder ini: {duplicates.join(', ')}.</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Batal</Button>
          <Button onClick={() => onConfirm(request)} disabled={errors.length > 0} data-testid="drop-upload-confirm">
            Unggah {files.length > 1 ? `${files.length} berkas` : 'berkas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
