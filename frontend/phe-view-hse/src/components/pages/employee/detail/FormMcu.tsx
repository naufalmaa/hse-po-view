import { ControlForm } from "@/components/custom/forms";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LuFileText, LuFolderOpen, LuStethoscope, LuHospital } from "react-icons/lu";
import { AssetListView } from "@/components/pages/daily-report/create";
import { useAppTranslation } from "@/lib/i18n-typed";

type Props = {
  values?: any,
  form?: any,
  files?: Array<any>,
  onDeleteAssets?: (item: any) => void,
}

const FormMcu = ({ values, form, files, onDeleteAssets, ...props }: Props) => {
  const { t } = useAppTranslation();
  const [activeTab, setActiveTab] = useState("details");

  // Watch the evidence field to show file count and maintain state
  const evidenceFiles = form.watch("evidence");
  const [fileCount, setFileCount] = useState(0);

  // Update file count whenever evidenceFiles changes
  useEffect(() => {
    if (evidenceFiles && Array.isArray(evidenceFiles)) {
      setFileCount(evidenceFiles.length);
    } else {
      setFileCount(0);
    }
  }, [evidenceFiles]);

  const hasFiles = fileCount > 0;
  const hasAssetFiles = files && Array.isArray(files) && files.length > 0;

  // Determine number of tabs based on available data
  const tabCount = hasAssetFiles ? 4 : 3;

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-${tabCount} mb-2`}>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <LuStethoscope className="w-4 h-4" />
            {t($ => $.employee.mcu.title)}
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <LuStethoscope className="w-4 h-4" />
            {t($ => $.employee.mcu.status)}
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <LuFileText className="w-4 h-4" />
            {t($ => $.employee.mcu.uploadFiles)}
            {hasFiles && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {fileCount}
              </Badge>
            )}
          </TabsTrigger>
          {hasAssetFiles && (
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <LuFolderOpen className="w-4 h-4" />
              {t($ => $.employee.mcu.supportingFiles)}
              <Badge variant="secondary" className="ml-1 text-xs">
                {files.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-0">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="space-y-4">
              {/* Hospital Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <LuHospital className="w-4 h-4" />
                  {t($ => $.employee.mcu.title)}
                </div>
                <ControlForm form={form} item={values?.mcuHospitalName} showMessage={false} />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ControlForm form={form} item={values?.mcuDate} showMessage={false} />
                <ControlForm form={form} item={values?.mcuExpiredDate} showMessage={false} />
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <ControlForm form={form} item={values?.mcuDeviationNotes} showMessage={false} />
                <ControlForm form={form} item={values?.mcuFollowUp} showMessage={false} />
                <ControlForm form={form} item={values?.ohihReview} showMessage={false} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4 mt-0">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent>
              <div className="space-y-4">
                <ControlForm form={form} item={values?.statusKelaikanBekerja} showMessage={false} />
                <ControlForm form={form} item={values?.skjScore} showMessage={false} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4 mt-0">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent>
              {/* Evidence Files - Always render to maintain state */}
              <div key={`evidence-${activeTab}`}>
                <ControlForm form={form} item={values?.evidence} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4 mt-0">
          <Card className="border-l-4 border-l-green-500">
            <CardContent>
              {/* Asset Files List */}
              <AssetListView
                data={files || []}
                showSelection={false}
                onDeleteAssets={onDeleteAssets}
                className="border-0"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FormMcu;