import "./AssetDemo.css";
import {
  useMutation,
  useQuery,
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { LoginModal } from "@/admin-ui/components/LoginModal";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback } from "react";

interface AssetDemoProps {
  folderPath: string;
  basename: string;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`asset-demo-skeleton ${className || ""}`} />;
}

function ControlPanel({ folderPath, basename }: AssetDemoProps) {
  const versions = useQuery(api.versionedAssets.getAssetVersions, {
    folderPath,
    basename,
  });
  const startUpload = useMutation(api.generateUploadUrl.startUpload);
  const finishUpload = useMutation(api.generateUploadUrl.finishUpload);
  const restoreVersion = useMutation(api.versionedAssets.restoreVersion);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const isLoading = versions === undefined;

  // Default expand the newest version (first in list)
  const activeVersion = expandedVersion ?? versions?.[0]?._id ?? null;

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) {
        alert("Please drop an image file");
        return;
      }

      setIsUploading(true);
      try {
        const { intentId, uploadUrl, backend } = await startUpload({
          folderPath,
          basename,
          filename: file.name,
        });

        if (backend === "r2") {
          // R2: PUT file directly to presigned URL
          await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          // For R2, no storageId needed
          await finishUpload({
            intentId,
            size: file.size,
            contentType: file.type,
          });
        } else {
          // Convex: POST file, get storageId from response
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            body: file,
            headers: { "Content-Type": file.type },
          });
          const { storageId } = await uploadResponse.json();

          await finishUpload({
            intentId,
            uploadResponse: { storageId },
            size: file.size,
            contentType: file.type,
          });
        }
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed: " + (err as Error).message);
      } finally {
        setIsUploading(false);
      }
    },
    [startUpload, finishUpload, folderPath, basename],
  );

  const handleRestore = async (e: React.MouseEvent, versionId: string) => {
    e.stopPropagation();
    await restoreVersion({ versionId });
  };

  const toggleExpand = (versionId: string) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="asset-demo-panel">
      <div className="asset-demo-panel-header">
        <svg
          className="asset-demo-panel-icon-svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        <span className="asset-demo-panel-title">Asset Manager</span>
      </div>

      <Authenticated>
        <div
          className={`asset-demo-drop-zone ${isDragging ? "dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => void handleDrop(e)}
        >
          {isUploading ? (
            <div className="asset-demo-upload-progress">
              <div className="asset-demo-upload-spinner" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Drop image to upload new version</span>
            </>
          )}
        </div>
      </Authenticated>

      <Unauthenticated>
        <LoginPrompt />
      </Unauthenticated>

      <div className="asset-demo-section asset-demo-versions-section">
        <div className="asset-demo-section-label">Versions</div>
        <div className="asset-demo-version-list">
          {isLoading ? (
            <>
              <Skeleton className="asset-demo-skeleton-row" />
              <Skeleton className="asset-demo-skeleton-row" />
              <Skeleton className="asset-demo-skeleton-row" />
            </>
          ) : versions && versions.length > 0 ? (
            versions.map((v) => (
              <VersionItem
                key={v._id}
                version={v}
                isExpanded={activeVersion === v._id}
                onToggle={() => toggleExpand(v._id)}
                onRestore={(e) => void handleRestore(e, v._id)}
                formatTime={formatTime}
              />
            ))
          ) : (
            <div className="asset-demo-empty-card">No versions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginPrompt() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <div className="asset-demo-drop-zone">
        <div className="asset-demo-login-prompt">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" fill="none" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p>Sign in to upload new versions</p>
          <button
            className="asset-demo-login-btn"
            onClick={() => setShowLogin(true)}
          >
            Sign in
          </button>
        </div>
      </div>
      <LoginModal open={showLogin} />
    </>
  );
}

function VersionItem({
  version,
  isExpanded,
  onToggle,
  onRestore,
  formatTime,
}: {
  version: { _id: string; version: number; state: string; createdAt: number };
  isExpanded: boolean;
  onToggle: () => void;
  onRestore: (e: React.MouseEvent) => void;
  formatTime: (t: number) => string;
}) {
  const previewData = useQuery(
    api.versionedAssets.getVersionPreviewUrl,
    isExpanded ? { versionId: version._id } : "skip",
  );

  return (
    <div
      className={`asset-demo-version-item ${version.state} ${isExpanded ? "expanded" : ""}`}
      onClick={onToggle}
    >
      <div className="asset-demo-version-item-header">
        <div className="asset-demo-version-info">
          <span className="asset-demo-version-number">v{version.version}</span>
          <span className={`asset-demo-version-state ${version.state}`}>
            {version.state}
          </span>
        </div>
        <div className="asset-demo-version-actions">
          <span className="asset-demo-version-date">
            {formatTime(version.createdAt)}
          </span>
          <Authenticated>
            {version.state === "archived" && (
              <button className="asset-demo-restore-btn" onClick={onRestore}>
                Restore
              </button>
            )}
          </Authenticated>
        </div>
      </div>
      <div className="asset-demo-version-item-preview">
        {isExpanded && previewData?.url && (
          <img src={previewData.url} alt={`Version ${version.version}`} />
        )}
        {isExpanded && !previewData?.url && (
          <Skeleton className="asset-demo-skeleton-image" />
        )}
      </div>
    </div>
  );
}

function ViewerPanel({ folderPath, basename }: AssetDemoProps) {
  const currentImage = useQuery(api.versionedAssets.getPublishedFile, {
    folderPath,
    basename,
  });
  const isLoading = currentImage === undefined;

  // Convex HTTP routes are served from .convex.site (not .convex.cloud)
  const siteUrl =
    (import.meta.env.VITE_CONVEX_URL as string)?.replace(".cloud", ".site") ||
    "";
  const stableUrl = `${siteUrl}/assets/${folderPath}/${basename}`;
  const versionUrl = currentImage?.versionId
    ? `${siteUrl}/assets/v/${currentImage.versionId}`
    : null;

  return (
    <div className="asset-demo-panel">
      <div className="asset-demo-panel-header">
        <svg
          className="asset-demo-panel-icon-svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="asset-demo-panel-title">Live Preview</span>
        <span className="asset-demo-live-badge">
          <span className="asset-demo-live-dot" />
          LIVE
        </span>
      </div>

      <div className="asset-demo-viewer-display">
        {isLoading ? (
          <Skeleton className="asset-demo-skeleton-viewer" />
        ) : currentImage ? (
          <div className="asset-demo-viewer-content">
            <img
              src={currentImage.url}
              alt="Published"
              className="asset-demo-viewer-image"
            />
          </div>
        ) : (
          <div className="asset-demo-viewer-empty">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span>Drop an image to get started</span>
          </div>
        )}
      </div>

      <div className="asset-demo-url-section">
        <div className="asset-demo-url-item">
          <div className="asset-demo-url-label">
            <strong>Stable URL</strong>
            <span>Always latest version</span>
          </div>
          <a
            href={stableUrl}
            target="_blank"
            rel="noopener"
            className="asset-demo-url-value"
          >
            {stableUrl}
          </a>
        </div>
        {versionUrl && (
          <div className="asset-demo-url-item">
            <div className="asset-demo-url-label">
              <strong>Version URL</strong>
              <span>Immutable v{currentImage?.version}</span>
            </div>
            <a
              href={versionUrl}
              target="_blank"
              rel="noopener"
              className="asset-demo-url-value"
            >
              {versionUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function LogoutButton() {
  const { signOut } = useAuthActions();

  return (
    <button
      className="asset-demo-logout-btn"
      onClick={() => void signOut()}
      title="Sign out"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" fill="none" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}

export function AssetDemo() {
  const folderPath = "/";
  const basename = "hero-image";
  return (
    <div className="asset-demo-container">
      <Authenticated>
        <LogoutButton />
      </Authenticated>
      <header className="asset-demo-header">
        <h1>Versioned Assets Demo</h1>
        <p>Version history - Instant rollback - Direct CDN delivery</p>
      </header>
      <main className="asset-demo-main">
        <ControlPanel folderPath={folderPath} basename={basename} />
        <ViewerPanel folderPath={folderPath} basename={basename} />
      </main>
    </div>
  );
}
