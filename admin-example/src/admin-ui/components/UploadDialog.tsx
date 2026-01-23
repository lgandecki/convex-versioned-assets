"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { useAdminAPI } from "@/admin-ui/lib/AdminUIContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/admin-ui/ui/dialog";
import { Button } from "@/admin-ui/ui/button";
import { Input } from "@/admin-ui/ui/input";
import { Label } from "@/admin-ui/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, FileUp, X } from "lucide-react";
import { cn, formatBytes } from "@/admin-ui/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderPath: string;
  existingBasename?: string; // If provided, upload as new version
}

export function UploadDialog({
  open,
  onOpenChange,
  folderPath,
  existingBasename,
}: UploadDialogProps) {
  const api = useAdminAPI();
  const [file, setFile] = useState<File | null>(null);
  const [basename, setBasename] = useState(existingBasename || "");
  const [label, setLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startUpload = useMutation(api.generateUploadUrl.startUpload);
  const finishUpload = useMutation(api.generateUploadUrl.finishUpload);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    if (!existingBasename && !basename) {
      setBasename(selectedFile.name);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    const finalBasename = existingBasename || basename.trim();
    if (!finalBasename) {
      toast.error("Please enter a filename");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Start upload to get intentId, uploadUrl, and backend type
      const { intentId, uploadUrl, backend } = await startUpload({
        folderPath,
        basename: finalBasename,
        label: label.trim() || undefined,
      });

      // 2. Upload file - method differs by backend (R2 uses PUT, Convex uses POST)
      let res: Response;
      try {
        res = await fetch(uploadUrl, {
          method: backend === "r2" ? "PUT" : "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
      } catch (fetchError) {
        // CORS errors show as generic "Failed to fetch" - make it clearer
        console.error("Upload fetch failed:", fetchError);
        throw new Error(
          backend === "r2"
            ? "Upload to R2 failed - check CORS configuration on your R2 bucket"
            : "Upload failed - network error"
        );
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${errorText}`);
      }

      // 3. Parse response - Convex returns JSON with storageId, R2 returns empty
      const uploadResponse = backend === "convex" ? await res.json() : undefined;

      // 4. Finish the upload with file metadata
      await finishUpload({
        intentId,
        uploadResponse,
        size: file.size,
        contentType: file.type,
      });

      toast.success("File uploaded successfully");

      // Reset form
      setFile(null);
      setBasename("");
      setLabel("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingBasename ? "Upload New Version" : "Upload Asset"}
          </DialogTitle>
          <DialogDescription>
            {existingBasename ? (
              <>
                Upload a new version of{" "}
                <code className="text-primary">{existingBasename}</code>
              </>
            ) : (
              <>
                Upload a file to{" "}
                <code className="text-primary">{folderPath || "(root)"}</code>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
              dragOver
                ? "border-primary bg-primary/5"
                : file
                  ? "border-success bg-success/5"
                  : "border-[var(--color-border)] hover:border-primary/50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  handleFileSelect(selectedFile);
                }
              }}
            />
            {file ? (
              <div className="flex items-center gap-3">
                <FileUp className="h-8 w-8 text-success" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} · {file.type || "Unknown type"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">
                  Drop a file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Any file type supported
                </p>
              </div>
            )}
          </div>

          {/* Basename (only if not uploading new version) */}
          {!existingBasename && (
            <div className="space-y-2">
              <Label htmlFor="basename">Filename</Label>
              <Input
                id="basename"
                placeholder="my-file.png"
                value={basename}
                onChange={(e) => setBasename(e.target.value)}
              />
            </div>
          )}

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Version Label (optional)</Label>
            <Input
              id="label"
              placeholder="Initial upload, Fixed typo, etc."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
