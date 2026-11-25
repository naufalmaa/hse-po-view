import { ControlForm } from "@/components/custom/forms";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LuFileText, LuInfo, LuFolderOpen, LuAward } from "react-icons/lu";
import { AssetListView } from "@/components/pages/daily-report/create";
import { useAppTranslation } from "@/lib/i18n-typed";

type Props = {
  values?: any,
  form?: any,
  files?: Array<any>,
  onDeleteAssets?: (item: any) => void,
}

const FormCertificate = ({ values, form, files, onDeleteAssets, ...props }: Props) => {
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
            <LuAward className="w-4 h-4" />
            {t($ => $.employee.certificate.title)}
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <LuFileText className="w-4 h-4" />
            {t($ => $.employee.certificate.uploadFiles)}
            {hasFiles && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {fileCount}
              </Badge>
            )}
          </TabsTrigger>
          {hasAssetFiles && (
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <LuFolderOpen className="w-4 h-4" />
              {t($ => $.employee.certificate.supportingFiles)}
              <Badge variant="secondary" className="ml-1 text-xs">
                {files.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-0">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="space-y-4">
              {/* Certificate Name */}
              <ControlForm form={form} item={values?.name} showMessage={false} />

              {/* Expired Date */}
              <ControlForm form={form} item={values?.expiredDate} showMessage={false} />

              {/* Is Permanent */}
              <ControlForm form={form} item={values?.isPermanent} showMessage={false} />
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

export default FormCertificate;