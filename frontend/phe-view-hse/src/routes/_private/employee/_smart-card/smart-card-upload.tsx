import { createFileRoute, Link } from '@tanstack/react-router'
import { useAppTranslation } from '@/lib/i18n-typed';
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { UploadInstructions, UploadSection, UploadHistory, RelatedTools } from '@/components/pages/employee/smart-card/upload';

export const Route = createFileRoute('/_private/employee/_smart-card/smart-card-upload')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useAppTranslation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    // Trigger refresh of upload history
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section with Navigation */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t($ => $.smartCardUpload.header.title)}</h1>
              <p className="text-muted-foreground mt-1">{t($ => $.smartCardUpload.header.description)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Instructions */}
      <UploadInstructions />

      {/* Upload Section */}
      <UploadSection onUploadComplete={handleUploadComplete} />

      {/* Upload History */}
      <UploadHistory refreshTrigger={refreshTrigger} />

      {/* Related Tools */}
      {/* <RelatedTools /> */}
    </div>
  );
}