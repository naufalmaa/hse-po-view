import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router"; // Added Link import
import { useAppTranslation, type TranslationSchema } from '@/lib/i18n-typed';
import { usePobUpdate, PobData } from "@/service/employee/pob/pob-update";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History } from "lucide-react"; // Added History icon
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { BsUpload } from "react-icons/bs";
import { LuAnchor, LuHammer, LuHandshake } from "react-icons/lu";
import { PobUploadSection, PobCategoryCard, CategoryKey, CategorySetting } from "@/components/pages/employee/pob/pob-update";
import { AppRoute } from "@/constants/app-route";

export const Route = createFileRoute("/_private/employee/(pob)/pob-update")({
  component: PobUpdatePage,
});

const ITEMS_PER_PAGE = 10;

function PobUpdatePage() {
  const { t } = useAppTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PobData | null>(null);
  const [categorySettings, setCategorySettings] = useState<Record<CategoryKey, CategorySetting>>({
    marine: { selected: false, updateStatus: true, currentPage: 1 },
    project: { selected: false, updateStatus: true, currentPage: 1 },
    mitra: { selected: false, updateStatus: true, currentPage: 1 },
  });

  const { mutateAsync: updatePobAsync, isPending } = usePobUpdate();

  const handleProcessUpdate = async (category: CategoryKey) => {
    if (!file) return;

    try {
      const settings = categorySettings[category];
      await updatePobAsync({
        file,
        updates: settings.updateStatus,
        category: category,
      });
      showNotifSuccess({ message: `Update for ${t($ => $.pobUpdate.categories[category as keyof TranslationSchema['pobUpdate']['categories']] as unknown as string)} processed successfully.` });
    } catch (error: any) {
      showNotifError({ message: error.message || "An error occurred during update." });
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setCategorySettings({
      marine: { selected: false, updateStatus: true, currentPage: 1 },
      project: { selected: false, updateStatus: true, currentPage: 1 },
      mitra: { selected: false, updateStatus: true, currentPage: 1 },
    });
  };

  // Helper function to reset settings when file changes (passed to upload section)
  const handleResetSettings = () => {
    setCategorySettings({
      marine: { selected: false, updateStatus: true, currentPage: 1 },
      project: { selected: false, updateStatus: true, currentPage: 1 },
      mitra: { selected: false, updateStatus: true, currentPage: 1 },
    });
  };



  const toggleCategoryUpdateStatus = (key: CategoryKey) => {
    setCategorySettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], updateStatus: !prev[key].updateStatus },
    }));
  };

  const handlePageChange = (key: CategoryKey, newPage: number) => {
    setCategorySettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], currentPage: newPage },
    }));
  };


  return (
    <div className="w-full space-y-6">
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BsUpload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.pobUpdate.title)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.pobUpdate.description)}</p>
            </div>
          </div>
          <Link to={AppRoute.employee.pobUnmatchedLogs.url}>
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              {t($ => $.pobUpdate.unmatchedLogs)}
            </Button>
          </Link>
        </div>
      </div>

      <PobUploadSection
        file={file}
        setFile={setFile}
        setPreviewData={setPreviewData}
        isPending={isPending}
        onResetSettings={handleResetSettings}
        onReset={handleReset}
      />

      {previewData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t($ => $.pobUpdate.form.title)}</h2>
          </div>

          <div className="space-y-6">
            <Tabs defaultValue="project" className="w-full">
              <TabsList className="">
                <TabsTrigger value="project" className="flex items-center gap-2">
                  <LuHammer className="h-4 w-4" />
                  {t($ => $.pobUpdate.categories.project)} ({previewData.project?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="marine" className="flex items-center gap-2">
                  <LuAnchor className="h-4 w-4" />
                  {t($ => $.pobUpdate.categories.marine)} ({previewData.marine?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="mitra" className="flex items-center gap-2">
                  <LuHandshake className="h-4 w-4" />
                  {t($ => $.pobUpdate.categories.mitra)} ({previewData.mitra?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="project" className="mt-0">
                <PobCategoryCard
                  categoryKey="project"
                  icon={<LuHammer className="h-5 w-5 text-orange-500" />}
                  items={previewData.project || []}
                  settings={categorySettings.project}
                  colorClass="text-orange-500"
                  borderColorClass="border-b-orange-500"
                  onProcess={handleProcessUpdate}
                  isProcessing={isPending}
                  onToggleUpdateStatus={toggleCategoryUpdateStatus}
                  onPageChange={handlePageChange}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </TabsContent>

              <TabsContent value="marine" className="mt-0">
                <PobCategoryCard
                  categoryKey="marine"
                  icon={<LuAnchor className="h-5 w-5 text-blue-500" />}
                  items={previewData.marine || []}
                  settings={categorySettings.marine}
                  colorClass="text-blue-500"
                  borderColorClass="border-b-blue-500"
                  onProcess={handleProcessUpdate}
                  isProcessing={isPending}
                  onToggleUpdateStatus={toggleCategoryUpdateStatus}
                  onPageChange={handlePageChange}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </TabsContent>

              <TabsContent value="mitra" className="mt-0">
                <PobCategoryCard
                  categoryKey="mitra"
                  icon={<LuHandshake className="h-5 w-5 text-green-500" />}
                  items={previewData.mitra || []}
                  settings={categorySettings.mitra}
                  colorClass="text-green-500"
                  borderColorClass="border-b-green-500"
                  onProcess={handleProcessUpdate}
                  isProcessing={isPending}
                  onToggleUpdateStatus={toggleCategoryUpdateStatus}
                  onPageChange={handlePageChange}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
