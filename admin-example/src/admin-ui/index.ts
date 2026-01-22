/**
 * convex-versioned-assets Admin UI
 *
 * A self-contained admin panel for managing versioned assets.
 *
 * @example
 * ```tsx
 * import { AdminPanel, AdminUIProvider } from "convex-versioned-assets/admin-ui";
 * import "convex-versioned-assets/admin-ui/styles";
 * import { api } from "./convex/_generated/api";
 *
 * function App() {
 *   return (
 *     <AdminUIProvider api={api}>
 *       <AdminPanel />
 *     </AdminUIProvider>
 *   );
 * }
 * ```
 */

// Main exports
export { AdminPanel } from "./AdminPanel";
export { AdminUIProvider, useAdminAPI, useAdminQueries } from "./lib/AdminUIContext";
export { LoginModal } from "./components/LoginModal";

// Types
export type { AdminPanelProps } from "./types";

// Individual components for advanced customization
export { FolderTree, FolderTreeSkeleton, FolderTreeCollapsed } from "./components/FolderTree";
export { AssetList, AssetListSkeleton } from "./components/AssetList";
export { AssetDetail, AssetDetailSkeleton } from "./components/AssetDetail";
export { AssetCard } from "./components/AssetCard";
export { AssetListRow } from "./components/AssetListRow";
export { CreateFolderDialog } from "./components/CreateFolderDialog";
export { UploadDialog } from "./components/UploadDialog";
export { CodeSnippetDialog } from "./components/CodeSnippetDialog";

// Utilities
export { cn, formatBytes, getContentTypeCategory } from "./lib/utils";
export { getVersionUrl } from "./lib/assetUrl";
export { createQueries } from "./lib/queries";
