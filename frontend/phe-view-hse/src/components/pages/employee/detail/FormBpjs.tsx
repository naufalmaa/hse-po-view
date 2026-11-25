import { ControlForm } from "@/components/custom/forms";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LuShield, LuFileText, LuFolderOpen } from "react-icons/lu";
import { AssetListView } from "@/components/pages/daily-report/create";
import { useAppTranslation } from "@/lib/i18n-typed";

type Props = {
  values?: any,
  form?: any,
  files?: Array<any> | [],
  onDeleteAssets?: (item: any) => void,
}
const FormBpjs = ({ values, form, files, onDeleteAssets, ...props }: Props) => {
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
  const tabCount = hasAssetFiles ? 3 : 2;

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-${tabCount} mb-2`}>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <LuShield className="w-4 h-4" />
            {t($ => $.employee.bpjs.title)}
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <LuFileText className="w-4 h-4" />
            {t($ => $.employee.bpjs.uploadFiles)}
            {hasFiles && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {fileCount}
              </Badge>
            )}
          </TabsTrigger>
          {hasAssetFiles && (
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <LuFolderOpen className="w-4 h-4" />
              {t($ => $.employee.bpjs.supportingFiles)}
              <Badge variant="secondary" className="ml-1 text-xs">
                {files.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-0">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="space-y-4">
              {/* BPJS Type */}
              <ControlForm form={form} item={values?.type} showMessage={false} />

              {/* BPJS Number */}
              <ControlForm form={form} item={values?.number} showMessage={false} />
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

export default FormBpjs;