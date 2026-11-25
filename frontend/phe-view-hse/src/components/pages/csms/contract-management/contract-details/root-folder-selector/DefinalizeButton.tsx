import React, { useState } from 'react';
import { LockOpen, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ContractFolder } from '@/service/csms/folder-detail';
import { useDefinalizeFolder } from '@/service/csms/contract-management-api';
import { showNotifError, showNotifSuccess } from '@/lib/show-notif';
import { getFolderTitle } from './utils';

export const DEFINALIZE_REASON_MIN = 5;

interface DefinalizeButtonProps {
  folder: ContractFolder;
  onDone?: () => void;
}

/** Admin only: re-open a finalized assessment folder so the contractor can upload again. */
export const DefinalizeButton: React.FC<DefinalizeButtonProps> = ({ folder, onDone }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { mutate, isPending } = useDefinalizeFolder();
  const reasonOk = reason.trim().length >= DEFINALIZE_REASON_MIN;
  const fullyApproved = folder.approvalStatus?.isFullyApproved === true;

  const handleConfirm = () => {
    mutate(
      { folderId: folder.id, reason: reason.trim() },
      {
        onSuccess: (response: any) => {
          showNotifSuccess({ message: response?.message || 'Finalisasi berhasil dibuka' });
          setOpen(false);
          setReason('');
          onDone?.();
        },
        onError: (error: any) => showNotifError({ message: error?.response?.data?.message ?? error?.message }),
      }
    );
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
        onClick={() => setOpen(true)}
        data-testid="definalize-button"
      >
        <LockOpen className="mr-2 h-4 w-4" />
        Buka Finalisasi
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !isPending && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buka finalisasi penilaian?</AlertDialogTitle>
            <AlertDialogDescription>
              {getFolderTitle(folder.name)} akan dibuka kembali. Kontraktor bisa mengunggah dan mengubah berkas lagi.
              Berkas dan skor yang sudah ada tidak dihapus, dan kontraktor akan menerima notifikasi.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              {fullyApproved
                ? 'Penilaian ini sudah disetujui sampai Manager. Persetujuan yang ada tetap berlaku setelah difinalisasi ulang.'
                : 'Alur persetujuan dilanjutkan dari level terakhir saat folder difinalisasi ulang.'}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="definalize-reason">Alasan (wajib)</Label>
            <Textarea
              id="definalize-reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Mis. "Kontraktor perlu mengganti dokumen 4.2 yang salah unggah"'
            />
            {!reasonOk && reason.length > 0 && (
              <p className="text-xs text-muted-foreground">Minimal {DEFINALIZE_REASON_MIN} karakter.</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={!reasonOk || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buka Finalisasi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
