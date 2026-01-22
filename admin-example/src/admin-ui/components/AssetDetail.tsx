"use client";

import { useEffect } from "react";
import { useMutation, useQuery as useConvexQuery } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAPI, useAdminQueries } from "@/admin-ui/lib/AdminUIContext";
import { formatDistanceToNow } from "date-fns";
import {
  X,
  Copy,
  Download,
  Upload,
  CheckCircle,
  Clock,
  Archive,
  Image,
  Music,
  Video,
  FileText,
  FileJson,
  Package,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { cn, getContentTypeCategory, formatBytes } from "@/admin-ui/lib/utils";
import { Button } from "@/admin-ui/ui/button";
import { Badge } from "@/admin-ui/ui/badge";
import { ScrollArea } from "@/admin-ui/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/admin-ui/ui/tooltip";
import { getVersionUrl } from "@/admin-ui/lib/assetUrl";
import { toast } from "sonner";

interface AssetDetailProps {
  folderPath: string;
  basename: string;
  selectedVersionId: string | null;
  onVersionSelect: (versionId: string | null) => void;
  onClose: () => void;
  onUploadNew: () => void;
}

const typeIcons = {
  image: Image,
  audio: Music,
  video: Video,
  text: FileText,
  json: FileJson,
  other: Package,
};

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
}

export function AssetDetail({
  folderPath,
  basename,
  selectedVersionId,
  onVersionSelect,
  onClose,
  onUploadNew,
}: AssetDetailProps) {
  const api = useAdminAPI();
  const queries = useAdminQueries();

  // Non-suspense queries so SSR renders instantly with loading state
  const { data: asset, isLoading: assetLoading } = useQuery(queries.asset(folderPath, basename));
  const { data: versions, isLoading: versionsLoading } = useQuery(queries.assetVersions(folderPath, basename));
  const { data: publishedFile } = useQuery(queries.publishedFile(folderPath, basename));

  // Fetch preview URL for selected version using Convex's native useQuery with "skip"
  const versionPreview = useConvexQuery(
    api.versionedAssets.getVersionPreviewUrl,
    selectedVersionId ? { versionId: selectedVersionId } : "skip"
  );

  const restoreVersion = useMutation(api.versionedAssets.restoreVersion);

  // Auto-select published version when no version is selected in URL
  // Must be called before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (asset?.publishedVersionId && !selectedVersionId) {
      onVersionSelect(asset.publishedVersionId);
    }
  }, [asset?.publishedVersionId, selectedVersionId, onVersionSelect]);

  // Get the selected version data - compute before early return
  const selectedVersion = versions?.find((v: { _id: string }) => v._id === selectedVersionId);
  // Use the queried preview URL (works for archived versions) or fall back to published file URL
  const previewUrl = versionPreview?.url ?? publishedFile?.url;
  const previewContentType = selectedVersion?.contentType || publishedFile?.contentType;
  const category = getContentTypeCategory(previewContentType);
  const Icon = typeIcons[category];

  const isLoading = assetLoading || versionsLoading;

  if (isLoading || !asset || !versions) {
    return <AssetDetailSkeleton />;
  }

  const handleRestoreVersion = async (versionId: string, versionNumber: number) => {
    try {
      const result = await restoreVersion({ versionId });
      onVersionSelect(result.versionId);
      toast.success(`Restored version ${versionNumber} as version ${result.version}`);
    } catch (error) {
      toast.error("Failed to restore version");
    }
  };

  // With suspense, asset is always defined (null means not found)
  if (!asset) {
    return (
      <div className="h-full bg-card border-l border-[var(--color-border)] flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Asset not found</p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full bg-card border-l border-[var(--color-border)] flex flex-col animate-slide-in-right">
        {/* Header - matches AssetList header height */}
        <div className="px-4 py-[22px] border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">
              {basename}
            </h2>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {folderPath || "(root)"}/{basename}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">
                  Preview
                </h3>
                {selectedVersion && (
                  <Badge
                    variant={selectedVersion.state as any}
                    className="text-xs"
                  >
                    v{selectedVersion.version} ({selectedVersion.state})
                  </Badge>
                )}
              </div>
              <div className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-surface-2">
                {category === "image" && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={basename}
                    className="w-full h-auto max-h-64 object-contain"
                  />
                ) : category === "audio" && previewUrl ? (
                  <div className="p-4">
                    <audio
                      controls
                      className="w-full"
                      src={previewUrl}
                      key={previewUrl}
                    />
                  </div>
                ) : category === "video" && previewUrl ? (
                  <video
                    controls
                    className="w-full max-h-64"
                    src={previewUrl}
                    key={previewUrl}
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center">
                    <Icon className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant={category as any} className="capitalize">
                    {publishedFile?.contentType || "Unknown"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span>
                    {publishedFile?.size
                      ? formatBytes(publishedFile.size)
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Versions</span>
                  <span>{asset.versionCounter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {publishedFile ? (
                    <Badge variant="published">Published</Badge>
                  ) : (
                    <Badge variant="muted">No versions</Badge>
                  )}
                </div>
              </div>
            </div>

            

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={onUploadNew}>
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
              {publishedFile?.url && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(publishedFile.url!, "Published URL")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Published URL</TooltipContent>
                </Tooltip>
              )}
              {publishedFile?.url && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={publishedFile.url}
                        download={basename}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Version History */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Version History
              </h3>
              {versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No versions yet. Upload a file to create the first version.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...versions].reverse().map((version) => {
                    const versionUrl =
                      version.storageId &&
                      getVersionUrl({
                        versionId: version._id,
                        basename,
                      });
                    const isSelected = selectedVersionId === version._id;

                    return (
                      <div
                        key={version._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onVersionSelect(version._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onVersionSelect(version._id);
                          }
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all cursor-pointer",
                          isSelected
                            ? "ring-2 ring-primary ring-offset-1"
                            : "hover:border-primary/50",
                          version.state === "published"
                            ? "border-success/30 bg-success/5"
                            : "border-[var(--color-border)] bg-surface-1"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {version.state === "published" ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <Archive className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm">
                              Version {version.version}
                            </span>
                            <Badge
                              variant={version.state as any}
                              className="text-[10px]"
                            >
                              {version.state}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {versionUrl && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(
                                        versionUrl,
                                        `Version ${version.version} URL`
                                      );
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Version URL</TooltipContent>
                              </Tooltip>
                            )}
                            {versionUrl && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="h-6 w-6"
                                    onClick={(e) => e.stopPropagation()}
                                    asChild
                                  >
                                    <a
                                      href={versionUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open in New Tab</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          {version.label && (
                            <p className="italic">"{version.label}"</p>
                          )}
                          <div className="flex items-center gap-3">
                            {version.size && (
                              <span>{formatBytes(version.size)}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(
                                new Date(version.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                        </div>

                        {version.state === "archived" && version.storageId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreVersion(version._id, version.version);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-2" />
                            Restore This Version
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

// Skeleton shown during direct navigation (before data loads)
export function AssetDetailSkeleton() {
  return (
    <div className="h-full bg-card border-l border-[var(--color-border)] flex flex-col">
      {/* Header - matches AssetList header height */}
      <div className="px-4 py-[22px] border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
      </div>
      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="aspect-video rounded-lg bg-muted animate-pulse" />
        </div>
        {/* Details */}
        <div>
          <div className="h-4 w-16 rounded bg-muted animate-pulse mb-3" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded bg-muted animate-pulse" />
          <div className="h-9 w-9 rounded bg-muted animate-pulse" />
          <div className="h-9 w-9 rounded bg-muted animate-pulse" />
        </div>
        {/* Version History */}
        <div>
          <div className="h-4 w-28 rounded bg-muted animate-pulse mb-3" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
