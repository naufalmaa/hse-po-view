import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle2, XCircle, Clock, Square, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { isAdmin } from '@/types/auth';
import {
  useAiEvaluate,
  useAiActiveJob,
  useAiEvaluateStatus,
  useAiCancelJob,
  useAiEngineHealth,
  useAiChanged,
} from '@/service/csms/contract-management-api';
import { AiModeDialog, type AiModeChoice } from './AiModeDialog';
import { showNotifSuccess, showNotifError } from '@/lib/show-notif';
import { ContractFolder } from '@/service/csms/folder-detail';

interface AiEvaluationButtonProps {
  selectedRootFolder: ContractFolder;
  refreshFolders?: () => void;
  onStatusChange?: (folderId: string, status: EvaluationStatus, progressMessage?: string) => void;
  isReevaluate?: boolean;
}

type EvaluationStatus = 'idle' | 'triggered' | 'queued' | 'processing' | 'completed' | 'failed';

type JobInfo = {
  progressMessage?: string | null;
  targetCount?: number;
  queuePosition?: number;
  createdAt?: string | null;
  startedAt?: string | null;
  errorMessage?: string | null;
  mode?: string | null;
};

// Average seconds per K3LL element measured on the internal vLLM (see CSMS_AI_TEST_REPORT.md);
// replaced by the live average once a few elements are done.
const DEFAULT_SECONDS_PER_ELEMENT = 45;
const POLL_MS = 5000;
const CANCELLED_MESSAGE = 'Dibatalkan oleh pengguna';
/** Fired by the folder table when an admin starts an element/group evaluation (detail: { folderId: rootId }). */
export const AI_JOB_STARTED_EVENT = 'csms-ai-job-started';

// elements whose last AI run could not score them (engine writes these prefixes)
const countFailedElements = (node: ContractFolder): number =>
  (node.children || []).reduce(
    (n, c) => n + (c.fileType === 'folder' && /^AI tidak /.test(c.aiReasoning ?? '') ? 1 : 0) + countFailedElements(c),
    0,
  );

// elements = folders named "<code> ..." that hold files directly (what the engine scores)
export const countElements = (node: ContractFolder): number =>
  (node.children || []).reduce(
    (n, c) =>
      n +
      (c.fileType === 'folder' && /^\d+(\.\d+)*\s/.test(c.name) && (c.children || []).some((x) => x.fileType === 'file') ? 1 : 0) +
      (c.fileType === 'folder' ? countElements(c) : 0),
    0,
  );

const formatDuration = (sec: number) => {
  if (sec < 60) return `${Math.max(0, Math.round(sec))} dtk`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} mnt`;
  return `${Math.floor(m / 60)} j ${m % 60} mnt`;
};

// "Extracting subfolder 3/29: ..." -> { current: 3, total: 29, phase }
const parseProgress = (msg?: string | null) => {
  const match = msg?.match(/subfolder (\d+)\/(\d+)/i);
  if (!match) return null;
  const lower = msg!.toLowerCase();
  const phase = lower.includes('extracting') ? 0.1 : lower.includes('embedding') ? 0.4 : 0.8;
  return { current: parseInt(match[1], 10), total: parseInt(match[2], 10), phase };
};

const CircularProgress = ({ value, size = 36, strokeWidth = 3.5 }: { value: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-purple-100 dark:text-purple-950/20"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-purple-600 dark:text-purple-400 transition-all duration-300"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[9px] font-bold text-purple-700 dark:text-purple-400">{value}%</span>
    </div>
  );
};

/** Small "AI engine online/offline" line, refreshed every minute. */
const EngineHealthLine = () => {
  const { data } = useAiEngineHealth();
  const health = (data as any)?.data;
  if (!health) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${health.online ? 'bg-green-500' : 'bg-red-500'}`} />
      {health.online ? `Mesin AI online${health.latencyMs != null ? ` (${health.latencyMs} ms)` : ''}` : 'Mesin AI offline'}
      {health.online && health.vision === false && (
        <span className="text-amber-700 dark:text-amber-400" title="Pindaian tetap dibaca dengan PaddleOCR, lebih lambat dan kurang akurat">
          · OCR cadangan (vision offline)
        </span>
      )}
    </div>
  );
};

export const AiEvaluationButton: React.FC<AiEvaluationButtonProps> = ({
  selectedRootFolder,
  refreshFolders,
  onStatusChange,
  isReevaluate = false,
}) => {
  const triggerMutation = useAiEvaluate();
  const checkActiveJobMutation = useAiActiveJob();
  const statusMutation = useAiEvaluateStatus();
  const cancelMutation = useAiCancelJob();
  const { data: healthData } = useAiEngineHealth();
  const { user } = useAuth();
  const admin = isAdmin(user);
  const failedCount = admin ? countFailedElements(selectedRootFolder) : 0;
  const engineOffline = (healthData as any)?.data?.online === false;
  const [dialog, setDialog] = useState<{ open: boolean; retryFailed: boolean }>({ open: false, retryFailed: false });
  const { data: changed, refetch: refetchChanged } = useAiChanged(selectedRootFolder.id, admin);

  const isEvaluated = selectedRootFolder.aiStatus === 'accept' || selectedRootFolder.aiStatus === 'reject';
  const [status, setStatus] = useState<EvaluationStatus>(isEvaluated ? 'completed' : 'idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobInfo>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [aiScore, setAiScore] = useState<number | null>(
    selectedRootFolder.aiScore ? Number(selectedRootFolder.aiScore) : null
  );
  const lastCheckedIdRef = useRef<string | null>(null);

  const progressMessage = job.progressMessage ?? '';
  const isActive = status === 'triggered' || status === 'queued' || status === 'processing';

  useEffect(() => {
    if (onStatusChange) {
      // the folder table only knows "processing"; a queued job is shown there the same way
      onStatusChange(selectedRootFolder.id, status === 'queued' ? 'processing' : status, progressMessage);
    }
  }, [status, progressMessage, selectedRootFolder.id, onStatusChange]);

  // keep the score badge in sync after a refresh of the folder tree
  useEffect(() => {
    setAiScore(selectedRootFolder.aiScore ? Number(selectedRootFolder.aiScore) : null);
  }, [selectedRootFolder.aiScore]);

  const applyJob = (j: any) => {
    setJobId(j.id);
    setJob({
      targetCount: j.targetFolderIds?.length ?? 0,
      progressMessage: j.progressMessage,
      queuePosition: j.queuePosition,
      createdAt: j.createdAt,
      startedAt: j.startedAt,
      errorMessage: j.errorMessage,
      mode: j.mode,
    });
    setStatus(j.status === 'queued' ? 'queued' : 'processing');
  };

  // On folder change: show the score if evaluated, and always pick up a job that is still running
  // (also for re-evaluations, which the old version missed).
  useEffect(() => {
    if (lastCheckedIdRef.current === selectedRootFolder.id) return;
    lastCheckedIdRef.current = selectedRootFolder.id;
    let isMounted = true;

    setStatus(isEvaluated ? 'completed' : 'idle');
    setJobId(null);
    setJob({});
    setConfirmCancel(false);

    checkActiveJobMutation
      .mutateAsync(selectedRootFolder.id)
      .then((res: any) => {
        const active = res?.data || null;
        if (isMounted && active && (active.status === 'queued' || active.status === 'processing')) applyJob(active);
      })
      .catch((err) => console.error('Failed to check active AI evaluation job:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedRootFolder.id, selectedRootFolder.aiStatus]);

  // A job started from the folder table (element/group) runs on this assessment folder: show it here too.
  useEffect(() => {
    const onStarted = (e: Event) => {
      const folderId = (e as CustomEvent).detail?.folderId;
      if (folderId !== selectedRootFolder.id) return;
      checkActiveJobMutation
        .mutateAsync(selectedRootFolder.id)
        .then((res: any) => {
          const active = res?.data || null;
          if (active && (active.status === 'queued' || active.status === 'processing')) applyJob(active);
        })
        .catch(() => {});
    };
    window.addEventListener(AI_JOB_STARTED_EVENT, onStarted);
    return () => window.removeEventListener(AI_JOB_STARTED_EVENT, onStarted);
  }, [selectedRootFolder.id]);

  // Poll the job while it is active: the source of truth for progress, queue position and the end state,
  // independent of the websocket.
  useEffect(() => {
    if (!jobId || !isActive || status === 'triggered') return;
    const timer = setInterval(() => {
      statusMutation
        .mutateAsync(jobId)
        .then((res: any) => {
          const j = res?.data;
          if (!j) return;
          if (j.status === 'completed') {
            setStatus(isReevaluate ? 'idle' : 'completed');
            setJob({});
            refreshFolders?.();
          } else if (j.status === 'failed') {
            if (j.errorMessage === CANCELLED_MESSAGE) {
              setStatus(isEvaluated ? 'completed' : 'idle');
              setJob({});
            } else {
              setStatus('failed');
              setJob({ errorMessage: j.errorMessage });
            }
            refreshFolders?.();
          } else {
            applyJob(j);
          }
        })
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [jobId, isActive, status]);

  // one-second clock for elapsed time / ETA
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  // every run asks for the mode first (fast / thorough)
  const handleTrigger = (e?: React.MouseEvent, retryFailed = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    refetchChanged();
    setDialog({ open: true, retryFailed });
  };

  const startJob = async (retryFailed: boolean, choice: AiModeChoice) => {
    try {
      setStatus('triggered');
      setJob({ progressMessage: 'Memulai evaluasi...', mode: choice.mode });
      const result = await triggerMutation.mutateAsync({
        folderId: selectedRootFolder.id,
        mode: choice.mode,
        ...(retryFailed ? { retryFailed: true } : choice.priorityOnly ? { priorityOnly: true } : {}),
      });
      const data = (result as any)?.data || result;
      if (data?.jobId) {
        setJobId(data.jobId);
        setJob({ progressMessage: 'Menunggu mesin AI...', createdAt: new Date().toISOString(), targetCount: data.targetCount ?? 0, mode: choice.mode });
        setStatus('queued');
      } else if (data?.success === false) {
        setStatus('idle');
        setJob({});
        showNotifError({ message: data?.message || 'Gagal memulai evaluasi' });
      }
    } catch (error: any) {
      setStatus('idle');
      setJob({});
      showNotifError({ message: error?.message || 'Gagal memulai evaluasi AI' });
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      await cancelMutation.mutateAsync({ jobId });
      showNotifSuccess({ message: 'Evaluasi AI dibatalkan' });
      setStatus(isEvaluated ? 'completed' : 'idle');
      setJob({});
      setJobId(null);
      refreshFolders?.();
    } catch (error: any) {
      showNotifError({ message: error?.message || 'Gagal membatalkan evaluasi' });
    } finally {
      setConfirmCancel(false);
    }
  };

  // AI scoring is an admin function (the admin also evaluates the AI results)
  if (!selectedRootFolder.isComplete || !admin) return null;

  const totalElements = countElements(selectedRootFolder);
  const modeDialog = (
    <AiModeDialog
      open={dialog.open}
      onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      targetLabel={dialog.retryFailed ? 'elemen yang gagal dinilai' : 'seluruh folder penilaian'}
      elementCount={dialog.retryFailed ? failedCount : totalElements}
      priorityCount={dialog.retryFailed ? undefined : changed?.priorityCount}
      onConfirm={(choice) => startJob(dialog.retryFailed, choice)}
    />
  );
  const changedCount = changed?.changedIds?.length ?? 0;
  const changedLine =
    changedCount > 0 ? (
      <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400" data-testid="ai-changed-since">
        {changedCount} elemen memiliki berkas baru sejak penilaian AI terakhir
      </p>
    ) : null;
  const modeLabel = job.mode === 'fast' ? ' · mode cepat' : job.mode === 'thorough' ? ' · mode menyeluruh' : '';

  const cancelControls = (
    <div className="mt-2 flex items-center justify-end gap-2">
      {confirmCancel ? (
        <>
          <span className="text-[11px] text-muted-foreground">Batalkan evaluasi ini?</span>
          <Button type="button" size="sm" variant="destructive" className="h-7 text-xs" onClick={handleCancel} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ya'}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmCancel(false)}>
            Tidak
          </Button>
        </>
      ) : (
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setConfirmCancel(true)} disabled={!jobId}>
          <Square className="mr-1 h-3 w-3" /> Batalkan
        </Button>
      )}
    </div>
  );

  // Admin: re-run only the elements the last run could not score
  const retryFailedButton =
    failedCount > 0 ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full mt-2 text-xs border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
        onClick={(e) => handleTrigger(e, true)}
        disabled={triggerMutation.isPending || engineOffline}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Ulangi {failedCount} elemen yang gagal
      </Button>
    ) : null;

  // Score badge when completed
  if (status === 'completed' && aiScore !== null && !isReevaluate) {
    return (
      <div className="rounded-md bg-muted p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Score</span>
          </div>
          <Badge variant={aiScore >= 6 ? 'default' : aiScore > 0 ? 'secondary' : 'destructive'} className="text-xs">
            <Sparkles className="mr-1 h-3 w-3" />
            {aiScore}/10
          </Badge>
        </div>
        <div className="mt-2 ml-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm text-muted-foreground">
            {selectedRootFolder.aiStatus === 'accept' ? 'Accepted' : 'Needs Review'}
          </span>
        </div>
        {selectedRootFolder.aiReasoning && (
          <p className="mt-2 ml-4 text-xs text-muted-foreground line-clamp-3">{selectedRootFolder.aiReasoning}</p>
        )}
        {changedLine}
        {modeDialog}
      </div>
    );
  }

  // Failed: reason + retry
  if (status === 'failed') {
    return (
      <div className="rounded-md bg-muted p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Evaluation Failed</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleTrigger} disabled={triggerMutation.isPending || engineOffline}>
            Ulangi
          </Button>
        </div>
        {job.errorMessage && <p className="mt-2 ml-6 text-xs text-red-600 dark:text-red-400 line-clamp-3">{job.errorMessage}</p>}
        {retryFailedButton}
        <EngineHealthLine />
        {modeDialog}
      </div>
    );
  }

  // Queued: waiting for the engine (no fake percentage)
  if (status === 'queued' || status === 'triggered') {
    const waitedSec = job.createdAt ? (now - new Date(job.createdAt).getTime()) / 1000 : 0;
    const position = job.queuePosition ?? 0;
    return (
      <div className="rounded-md bg-muted p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/30">
            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 block uppercase tracking-wide">
              {position > 1 ? `Antri — posisi ${position}` : 'Menunggu mesin AI'}
              {modeLabel}
            </span>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {position > 1 ? `${position - 1} evaluasi lain sedang/akan diproses lebih dulu` : progressMessage || 'Menyiapkan evaluasi...'}
              {waitedSec > 5 ? ` · ${formatDuration(waitedSec)}` : ''}
            </p>
          </div>
        </div>
        {cancelControls}
        <EngineHealthLine />
      </div>
    );
  }

  // Processing: elements x/N, elapsed, ETA
  if (status === 'processing') {
    const prog = parseProgress(progressMessage);
    const finishing = /finishing|recalculat/i.test(progressMessage);
    const pct = finishing ? 95 : prog ? Math.round(10 + ((prog.current - 1 + prog.phase) / prog.total) * 85) : 5;
    const elapsedSec = job.startedAt ? (now - new Date(job.startedAt).getTime()) / 1000 : 0;
    const done = prog ? prog.current - 1 : 0;
    const perElement = done >= 2 && elapsedSec > 0 ? elapsedSec / done : DEFAULT_SECONDS_PER_ELEMENT;
    const etaSec = prog ? (prog.total - prog.current + 1 - prog.phase) * perElement : null;
    const subject = progressMessage.split(': ').slice(1).join(': ');

    return (
      <div className="rounded-md bg-muted p-3">
        <div className="flex items-center gap-3">
          <CircularProgress value={pct} />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 block uppercase tracking-wide">
              {finishing
                ? 'Menyelesaikan evaluasi'
                : prog
                  ? `${job.targetCount ? 'Evaluasi sebagian' : 'AI Evaluasi'} — elemen ${prog.current}/${prog.total}`
                  : 'AI Evaluasi Berjalan'}
              {modeLabel}
            </span>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{subject || progressMessage || 'Mengekstraksi dokumen & analisis AI...'}</p>
            {elapsedSec > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Berjalan {formatDuration(elapsedSec)}
                {etaSec != null && !finishing ? ` · perkiraan selesai ±${formatDuration(etaSec)} lagi` : ''}
              </p>
            )}
          </div>
        </div>
        {cancelControls}
      </div>
    );
  }

  // Idle: trigger button + engine health
  return (
    <div className={isReevaluate ? 'mt-2' : ''}>
      <Button
        type="button"
        variant={isReevaluate ? 'default' : 'outline'}
        className="w-full"
        onClick={handleTrigger}
        disabled={triggerMutation.isPending || engineOffline}
        title={engineOffline ? 'Mesin AI sedang offline' : undefined}
      >
        {triggerMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
        )}
        {isReevaluate ? 'Re-Evaluate AI' : 'AI Evaluate'}
      </Button>
      {retryFailedButton}
      {changedLine}
      <EngineHealthLine />
      {modeDialog}
    </div>
  );
};
