"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useQuery as useTanstackQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAdminAPI, useAdminQueries } from "@/admin-ui/lib/AdminUIContext";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Grid3X3,
  PanelLeftClose,
  Folder,
  LogOut,
} from "lucide-react";
import { cn } from "@/admin-ui/lib/utils";
import { Button } from "@/admin-ui/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/admin-ui/ui/context-menu";
import { ScrollArea } from "@/admin-ui/ui/scroll-area";

interface FolderTreeProps {
  selectedFolderPath: string;
  onFolderSelect: (path: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onRenameFolder?: (path: string, currentName: string) => void;
  onToggleCollapse?: () => void;
}

interface FolderData {
  _id: string;
  path: string;
  name: string;
  _creationTime: number;
}

interface FolderItemProps {
  folder: FolderData;
  depth: number;
  selectedFolderPath: string;
  onFolderSelect: (path: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onRenameFolder?: (path: string, currentName: string) => void;
  onPrefetch: (path: string) => void;
}

function FolderItem({
  folder,
  depth,
  selectedFolderPath,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onPrefetch,
}: FolderItemProps) {
  const api = useAdminAPI();
  const isSelected = selectedFolderPath === folder.path;
  // Auto-expand if this folder is an ancestor of the selected path
  const isAncestorOfSelected = selectedFolderPath.startsWith(folder.path + "/");
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);

  // Expanded if: user explicitly expanded, OR is ancestor of selected, OR is selected
  const isExpanded = userExpanded ?? (isAncestorOfSelected || isSelected);

  // Query for children when expanded
  const children = useQuery(
    api.versionedAssets.listFolders,
    isExpanded ? { parentPath: folder.path } : "skip"
  );

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserExpanded(!isExpanded);
  };

  const handleFolderClick = () => {
    onFolderSelect(folder.path);
  };

  const handleMouseEnter = () => {
    onPrefetch(folder.path);
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={handleFolderClick}
            onMouseEnter={handleMouseEnter}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
              isSelected
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <span
              onClick={handleChevronClick}
              className="cursor-pointer hover:bg-accent rounded p-0.5 -m-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
            </span>
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{folder.name}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onCreateFolder(folder.path)}>
            <Plus className="h-4 w-4 mr-2" />
            New Subfolder
          </ContextMenuItem>
          {onRenameFolder && (
            <ContextMenuItem
              onClick={() => onRenameFolder(folder.path, folder.name)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem className="text-destructive" disabled>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {isExpanded && children && children.length > 0 && (
        <div className="animate-fade-in">
          {children.map((child: FolderData) => (
            <FolderItem
              key={child._id}
              folder={child}
              depth={depth + 1}
              selectedFolderPath={selectedFolderPath}
              onFolderSelect={onFolderSelect}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onPrefetch={onPrefetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  selectedFolderPath,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onToggleCollapse,
}: FolderTreeProps) {
  const queryClient = useQueryClient();
  const queries = useAdminQueries();
  const { signOut } = useAuthActions();

  // Query root folders - non-suspense so SSR renders instantly with loading state
  const { data: rootFolders, isLoading, error, isError } = useTanstackQuery(queries.folders(""));

  // Debug: log errors
  if (isError) {
    console.error("FolderTree query error:", error);
  }

  // Prefetch folder data on hover
  const handlePrefetch = useCallback(
    (folderPath: string) => {
      // Prefetch subfolders, assets, and published files for this folder
      queryClient.prefetchQuery(queries.folders(folderPath));
      queryClient.prefetchQuery(queries.assets(folderPath));
      queryClient.prefetchQuery(queries.publishedFilesInFolder(folderPath));
    },
    [queryClient, queries]
  );

  // Prefetch all root folders on initial load
  const hasPrefetched = useRef(false);
  useEffect(() => {
    if (!rootFolders || hasPrefetched.current) return;
    hasPrefetched.current = true;

    // Prefetch data for all root folders
    for (const folder of rootFolders as FolderData[]) {
      if (folder.path !== selectedFolderPath) {
        handlePrefetch(folder.path);
      }
    }
  }, [rootFolders, selectedFolderPath, handlePrefetch]);

  if (isLoading) {
    return <FolderTreeSkeleton onToggleCollapse={onToggleCollapse} />;
  }

  if (isError) {
    return (
      <aside className="h-full bg-sidebar border-r border-[var(--color-sidebar-border)] flex flex-col p-4">
        <p className="text-sm text-destructive font-medium">Error loading folders</p>
        <p className="text-xs text-muted-foreground mt-1">{error?.message || "Unknown error"}</p>
      </aside>
    );
  }

  if (!rootFolders) {
    return <FolderTreeSkeleton onToggleCollapse={onToggleCollapse} />;
  }

  return (
    <aside className="h-full bg-sidebar border-r border-[var(--color-sidebar-border)] flex flex-col">
      {/* Folder Tree */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2 px-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Folders
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={() => onCreateFolder("")}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                {onToggleCollapse && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={onToggleCollapse}
                    title="Collapse sidebar"
                  >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            {(rootFolders as FolderData[]).length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">
                No folders yet. Click + to create one.
              </p>
            ) : (
              <div className="space-y-0.5">
                {(rootFolders as FolderData[]).map((folder) => (
                  <FolderItem
                    key={folder._id}
                    folder={folder}
                    depth={0}
                    selectedFolderPath={selectedFolderPath}
                    onFolderSelect={onFolderSelect}
                    onCreateFolder={onCreateFolder}
                    onRenameFolder={onRenameFolder}
                    onPrefetch={handlePrefetch}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer with logout */}
      <div className="p-3 border-t border-[var(--color-sidebar-border)]">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

// Skeleton shown during direct navigation (before data loads)
export function FolderTreeSkeleton({ onToggleCollapse }: { onToggleCollapse?: () => void }) {
  return (
    <aside className="h-full bg-sidebar border-r border-[var(--color-sidebar-border)] flex flex-col">
      <div className="flex-1 p-3">
        <div className="flex items-center justify-between mb-2 px-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Folders
          </p>
          <div className="flex items-center gap-1">
            <div className="h-6 w-6 rounded bg-muted animate-pulse" />
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2 px-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-muted animate-pulse" />
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
              <div className="h-4 flex-1 rounded bg-muted animate-pulse" style={{ maxWidth: `${60 + i * 10}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="p-3 border-t border-[var(--color-sidebar-border)]">
        <div className="h-8 w-full rounded bg-muted animate-pulse" />
      </div>
    </aside>
  );
}

// Collapsed state - just shows an icon button
export function FolderTreeCollapsed({ onExpand }: { onExpand: () => void }) {
  return (
    <aside className="h-full bg-sidebar border-r border-[var(--color-sidebar-border)] flex flex-col items-center py-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onExpand}
        title="Expand sidebar"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
    </aside>
  );
}
