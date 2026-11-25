import React, { useEffect, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tutorial.css';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GraduationCap, CheckCircle2, Circle, Download, Play, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ROLE_LABEL, TUTORIAL_VERSION, Tutorial, TutorialRole, isTutorialEnabled, pdfUrlFor, tutorialsFor } from '@/constants/tutorials';

/**
 * Tutorial button next to the bell. Tours never start by themselves; on the first login after the feature is
 * enabled only this button is highlighted. Progress is kept per browser (localStorage), per user.
 */

type Progress = { done: string[]; introSeen: boolean };
const keyOf = (userId?: string) => `safeview-tutorial-${TUTORIAL_VERSION}-${userId ?? 'anon'}`;
const load = (userId?: string): Progress => {
  try {
    return { done: [], introSeen: false, ...JSON.parse(localStorage.getItem(keyOf(userId)) ?? '{}') };
  } catch {
    return { done: [], introSeen: false };
  }
};
const save = (userId: string | undefined, p: Progress) => {
  try {
    localStorage.setItem(keyOf(userId), JSON.stringify(p));
  } catch {
    /* storage blocked: tutorials still work, progress is just not remembered */
  }
};

const waitFor = (selector: string | undefined, ms = 2500) =>
  new Promise<void>((resolve) => {
    if (!selector) return resolve();
    const t0 = Date.now();
    const tick = () => (document.querySelector(selector) || Date.now() - t0 > ms ? resolve() : setTimeout(tick, 150));
    tick();
  });

export const TutorialMenu = () => {
  const auth = useAuth();
  const role = (auth?.user?.user?.role ?? '') as TutorialRole;
  const userId = auth?.user?.user?.id as string | undefined;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Progress>(() => load(userId));
  useEffect(() => setProgress(load(userId)), [userId]);

  if (!isTutorialEnabled() || !(role in ROLE_LABEL)) return null;
  const list = tutorialsFor(role);
  const pdf = pdfUrlFor(role);

  const update = (p: Progress) => {
    setProgress(p);
    save(userId, p);
  };
  const dismissIntro = () => update({ ...progress, introSeen: true });

  const run = async (t: Tutorial) => {
    setOpen(false);
    if (!progress.introSeen) dismissIntro();
    let steps = t.steps;
    if (t.requiresPath && !pathname.startsWith(t.requiresPath)) {
      navigate({ to: '/csms/contract-management' });
      steps = [{ title: t.title, text: t.requiresHint ?? 'Buka halaman yang sesuai lalu jalankan tutorial ini lagi.' }];
    } else if (t.route && pathname !== t.route) {
      navigate({ to: t.route });
    }
    await waitFor(steps.find((s) => s.element)?.element);
    const driveSteps: DriveStep[] = steps.map((s) => ({
      // a step whose element is not on the page is shown centred instead of failing
      element: s.element && document.querySelector(s.element) ? s.element : undefined,
      popover: { title: s.title, description: s.text },
    }));
    const tour = driver({
      steps: driveSteps,
      showProgress: true,
      allowClose: true,
      smoothScroll: true,
      popoverClass: 'safeview-tour',
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Lanjut ›',
      prevBtnText: '‹ Kembali',
      doneBtnText: 'Selesai',
      onDestroyed: () => {
        if (steps === t.steps) {
          const p = load(userId);
          update({ ...p, introSeen: true, done: [...new Set([...p.done, t.id])] });
        }
      },
    });
    tour.drive();
  };

  const doneCount = list.filter((t) => progress.done.includes(t.id)).length;
  const highlight = !progress.introSeen;

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative rounded-full', highlight && 'safeview-tour-pulse')}
            aria-label="Tutorial"
            title="Tutorial"
            data-tour="nav-tutorial"
            data-testid="nav-tutorial"
          >
            <GraduationCap className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0" data-testid="tutorial-menu">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-semibold">Tutorial · {ROLE_LABEL[role]}</div>
            <span className="text-[11px] text-muted-foreground">{doneCount}/{list.length} selesai</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {list.map((t) => {
              const done = progress.done.includes(t.id);
              return (
                <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/60" data-testid="tutorial-item">
                  {done ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{t.title}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{t.purpose}</div>
                  </div>
                  <Button size="sm" variant={done ? 'ghost' : 'outline'} className="h-7 px-2 text-[11px]" onClick={() => run(t)}>
                    {done ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    <span className="ml-1">{done ? 'Ulang' : 'Mulai'}</span>
                  </Button>
                </div>
              );
            })}
          </div>
          {pdf && (
            <div className="border-t p-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs">
                <a href={`${import.meta.env.BASE_URL}${pdf.replace(/^\//, '')}`} download data-testid="tutorial-pdf">
                  <Download className="mr-1.5 h-4 w-4" /> Unduh PDF panduan {ROLE_LABEL[role]}
                </a>
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {highlight && !open && (
        <div className="absolute right-0 top-full z-50 mt-1 flex items-center gap-1 whitespace-nowrap rounded-full bg-purple-600 px-2 py-0.5 text-[11px] text-white shadow" data-testid="tutorial-intro">
          Baru: Tutorial
          <button type="button" aria-label="Tutup" onClick={dismissIntro} className="opacity-80 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

