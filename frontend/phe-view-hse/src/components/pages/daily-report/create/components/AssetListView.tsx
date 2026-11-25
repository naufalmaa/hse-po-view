import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogModal, ModalProps } from "@/components/custom/components";
import { LuFile, LuImage, LuTrash2, LuDownload, LuExternalLink } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/my-utils";
import { Badge } from "@/components/ui/badge";

type Props = {
  data: any[];
  onEditAssets?: (item: any) => void;
  onDeleteAssets?: (item: any) => void;
  className?: string;
  disableAction?: boolean;
  sortingKey?: string;
  showSelection?: boolean;
}

const AssetListView = ({
  data,
  onEditAssets,
  onDeleteAssets,
  className,
  disableAction = false,
  sortingKey = "fileName",
  showSelection = true
}: Props) => {
  const [assetData, setAssetData] = useState(data);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [confirmationDelete, setConfirmationDelete] = useState<ModalProps | null>(null);

  useEffect(() => {
    const sortedData = [...data].sort((a, b) =>
      a?.[sortingKey]?.localeCompare(b?.[sortingKey]) || 0
    );
    setAssetData(sortedData);
  }, [data, sortingKey]);

  // Helper functions
  const isSelected = (id: string) => selectedItems.has(id);
  const isAllSelected = assetData.length > 0 && selectedItems.size === assetData.length;
  const isSomeSelected = selectedItems.size > 0 && selectedItems.size < assetData.length;

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(assetData.map(item => item.id)));
    }
  };

  const handleDeleteSelected = () => {
    const selectedAssets = assetData.filter(item => selectedItems.has(item.id));
    setConfirmationDelete({
      title: "Delete Assets",
      desc: `Are you sure you want to delete ${selectedAssets.length} selected asset${selectedAssets.length > 1 ? 's' : ''}?`,
      textConfirm: "Delete",
      textCancel: "Cancel",
      onConfirmClick: () => {
        setConfirmationDelete(null);
        if (onDeleteAssets) {
          onDeleteAssets({ ids: Array.from(selectedItems) });
        }
        setSelectedItems(new Set());
      },
      onCancelClick: () => setConfirmationDelete(null),
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("image/")) {
      return LuImage;
    }
    return LuFile;
  };

  // Render asset item
  const renderAssetItem = (item: any, index: number) => {
    const isImage = item.fileType?.includes("image/");
    const IconComponent = getFileIcon(item.fileType || "");

    return (
      <div
        key={item.id}
        className={cn(
          "group flex items-center gap-3 py-3 px-4 transition-all duration-200",
          "hover:bg-muted/30",
          isSelected(item.id) && "bg-primary/5 border-l-2 border-l-primary"
        )}
      >
        {/* Selection Checkbox */}
        {showSelection && !disableAction && (
          <div className="flex-shrink-0">
            <Checkbox
              checked={isSelected(item.id)}
              onCheckedChange={() => toggleSelection(item.id)}
              className="transition-all duration-200"
            />
          </div>
        )}

        {/* File Preview/Icon */}
        <div className="flex-shrink-0">
          {isImage && item.thumbnailUrl ? (
            <div className="relative overflow-hidden rounded-md">
              <img
                src={item.thumbnailUrl}
                alt={item.fileName}
                className="w-10 h-10 object-cover cursor-pointer transition-opacity hover:opacity-80"
                onClick={() => window.open(item.url, "_blank")}
              />
            </div>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md">
              <IconComponent className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* File Name */}
              <p className="text-sm font-medium text-foreground truncate mb-1">
                {item.fileName}
              </p>
              
              {/* File Details */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.fileType && (
                  <span className="uppercase font-medium">
                    {item.fileType.split('/')[1] || 'FILE'}
                  </span>
                )}
                {item.fileSize && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(item.fileSize)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/10"
                onClick={() => window.open(item.url, "_blank")}
                title="Open file"
              >
                <LuExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Empty state
  if (assetData.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
            <LuFile className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No files uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with Select All and Actions */}
      {showSelection && !disableAction && (
        <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
                      if (checkbox) checkbox.indeterminate = isSomeSelected;
                    }
                  }}
                  onCheckedChange={toggleSelectAll}
                  className="transition-all duration-200"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {selectedItems.size > 0
                      ? `${selectedItems.size} selected`
                      : 'Select all'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {assetData.length} file{assetData.length !== 1 ? 's' : ''} total
                  </span>
                </div>
              </div>
            </div>

            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground px-2 py-1 bg-background rounded border">
                  {selectedItems.size} of {assetData.length}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="h-8 gap-1.5 text-xs"
                >
                  <LuTrash2 className="w-3 h-3" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset List */}
      <div className="border border-border/50 rounded-lg">
        <div className="max-h-80 overflow-y-auto">
          <div className="divide-y divide-border/30">
            {assetData.map((item, index) => renderAssetItem(item, index))}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmationDelete && (
        <DialogModal modal={confirmationDelete} variantSubmit="destructive" />
      )}
    </div>
  );
};

export default AssetListView;