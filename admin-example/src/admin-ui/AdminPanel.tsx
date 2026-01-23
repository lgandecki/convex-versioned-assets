"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { Toaster } from "sonner";
import { FolderTree, FolderTreeSkeleton } from "./components/FolderTree";
import { AssetList, AssetListSkeleton } from "./components/AssetList";
import { AssetDetail, AssetDetailSkeleton } from "./components/AssetDetail";
import { CreateFolderDialog } from "./components/CreateFolderDialog";
import { UploadDialog } from "./components/UploadDialog";
import { CodeSnippetDialog } from "./components/CodeSnippetDialog";
import { TooltipProvider } from "@/admin-ui/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  usePanelRef,
} from "@/admin-ui/ui/resizable";
import { PanelLeft, LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/admin-ui/ui/button";
import { cn } from "@/admin-ui/lib/utils";
import type { AdminPanelProps } from "./types";

/**
 * Self-contained admin panel for managing versioned assets.
 *
 * @example Basic usage
 * ```tsx
 * <AdminUIProvider api={api}>
 *   <AdminPanel />
 * </AdminUIProvider>
 * ```
 *
 * @example With URL sync
 * ```tsx
 * const [searchParams, setSearchParams] = useSearchParams();
 * const path = searchParams.get("path") || "";
 *
 * <AdminUIProvider api={api}>
 *   <AdminPanel
 *     initialPath={path}
 *     onNavigate={(newPath) => setSearchParams({ path: newPath })}
 *   />
 * </AdminUIProvider>
 * ```
 */
export function AdminPanel({
  initialPath = "",
  onNavigate,
  className,
}: AdminPanelProps) {
  const { signOut } = useAuthActions();

  // Internal state - managed by the component
  const [folderPath, setFolderPath] = useState(initialPath);
  const [selectedAsset, setSelectedAsset] = useState<{
    folderPath: string;
    basename: string;
  } | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Sync with initialPath changes (e.g., browser back/forward)
  useEffect(() => {
    setFolderPath(initialPath);
    setSelectedAsset(null);
    setSelectedVersionId(null);
  }, [initialPath]);

  // Navigation handlers
  const handleFolderSelect = useCallback((path: string) => {
    setFolderPath(path);
    setSelectedAsset(null);
    setSelectedVersionId(null);
    onNavigate?.(path);
  }, [onNavigate]);

  const handleAssetSelect = useCallback((asset: { folderPath: string; basename: string } | null) => {
    setSelectedAsset(asset);
    setSelectedVersionId(null);
  }, []);

  const handleVersionSelect = useCallback((versionId: string | null) => {
    setSelectedVersionId(versionId);
  }, []);

  // Dialog state
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentPath, setCreateFolderParentPath] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBasename, setUploadBasename] = useState<string | undefined>();
  const [snippetOpen, setSnippetOpen] = useState(false);

  // Panel state for responsive sidebars
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftSizeBeforeCollapse, setLeftSizeBeforeCollapse] = useState<number | null>(null);
  const leftPanelRef = usePanelRef();

  // Toggle left sidebar
  const toggleLeftSidebar = useCallback(() => {
    const panel = leftPanelRef.current;
    if (panel) {
      if (leftCollapsed) {
        panel.expand();
        if (leftSizeBeforeCollapse !== null) {
          panel.resize(leftSizeBeforeCollapse);
        }
      } else {
        setLeftSizeBeforeCollapse(panel.getSize().inPixels);
        panel.collapse();
      }
    }
  }, [leftCollapsed, leftSizeBeforeCollapse, leftPanelRef]);

  // Dialog handlers
  const handleCreateFolder = (parentPath: string) => {
    setCreateFolderParentPath(parentPath);
    setCreateFolderOpen(true);
  };

  const handleUploadNew = () => {
    setUploadBasename(undefined);
    setUploadOpen(true);
  };

  const handleUploadNewVersion = (basename: string) => {
    setUploadBasename(basename);
    setUploadOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedAsset(null);
  };

  return (
    <TooltipProvider>
      <div className={cn("va-admin h-screen flex flex-col bg-background", className)}>
        {/* Main Content */}
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
        >
          {/* Left: Folder Tree */}
          <ResizablePanel
            id="left-sidebar"
            panelRef={leftPanelRef}
            defaultSize="240px"
            minSize="180px"
            maxSize="400px"
            collapsible
            collapsedSize="0px"
            onResize={(size) => {
              setLeftCollapsed(size.inPixels < 10);
            }}
          >
            <div className="h-full flex flex-col">
              <Suspense fallback={<FolderTreeSkeleton onToggleCollapse={toggleLeftSidebar} />}>
                <FolderTree
                  selectedFolderPath={folderPath}
                  onFolderSelect={handleFolderSelect}
                  onCreateFolder={handleCreateFolder}
                  onToggleCollapse={toggleLeftSidebar}
                />
              </Suspense>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Middle + Right Content */}
          <ResizablePanel id="main-content" minSize="400px">
            <div className="h-full flex">
              {/* Collapsed sidebar toggle */}
              {leftCollapsed && (
                <div className="h-full flex flex-col border-r border-[var(--color-border)] bg-sidebar shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="m-2"
                    onClick={toggleLeftSidebar}
                    title="Expand sidebar"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="m-2 text-muted-foreground hover:text-foreground"
                    onClick={() => signOut()}
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <ResizablePanelGroup orientation="horizontal" className="flex-1 h-full">
                {/* Middle: Asset List */}
                <ResizablePanel id="asset-list" minSize="300px">
                  <div className="h-full flex flex-col">
                    <Suspense fallback={<AssetListSkeleton />}>
                      <AssetList
                        folderPath={folderPath}
                        onAssetSelect={handleAssetSelect}
                        onFolderSelect={handleFolderSelect}
                        onUploadNew={handleUploadNew}
                        onCreateAsset={handleUploadNew}
                        onCreateFolder={() => handleCreateFolder(folderPath)}
                        onShowSnippet={() => setSnippetOpen(true)}
                      />
                    </Suspense>
                  </div>
                </ResizablePanel>

                {/* Right: Asset Detail (conditional) */}
                {selectedAsset && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel id="asset-detail" defaultSize="350px" minSize="280px" maxSize="500px">
                      <div className="h-full flex flex-col">
                        <Suspense fallback={<AssetDetailSkeleton />}>
                          <AssetDetail
                            folderPath={selectedAsset.folderPath}
                            basename={selectedAsset.basename}
                            selectedVersionId={selectedVersionId}
                            onVersionSelect={handleVersionSelect}
                            onClose={handleCloseDetail}
                            onUploadNew={() => handleUploadNewVersion(selectedAsset.basename)}
                          />
                        </Suspense>
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Dialogs */}
        <CreateFolderDialog
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          parentPath={createFolderParentPath}
        />

        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          folderPath={folderPath}
          existingBasename={uploadBasename}
        />

        <CodeSnippetDialog
          open={snippetOpen}
          onOpenChange={setSnippetOpen}
          folderPath={folderPath}
        />

        {/* Toast notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground)",
            },
          }}
        />
      </div>
    </TooltipProvider>
  );
}
