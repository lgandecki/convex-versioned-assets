import "./App.css";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useCallback } from "react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className || ""}`} />;
}

function AdminPanel() {
  const versions = useQuery(api.example.getVersionHistory);
  const startUpload = useMutation(api.example.startImageUpload);
  const finishUpload = useMutation(api.example.finishImageUpload);
  const restoreVersion = useMutation(api.example.restoreVersion);

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
        const { intentId, uploadUrl } = await startUpload({
          filename: file.name,
        });

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          body: file,
          headers: { "Content-Type": file.type },
        });
        const { storageId } = await uploadResponse.json();

        await finishUpload({
          intentId,
          storageId,
          size: file.size,
          contentType: file.type,
        });
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed: " + (err as Error).message);
      } finally {
        setIsUploading(false);
      }
    },
    [startUpload, finishUpload],
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
    <div className="panel">
      <div className="panel-header">
        <svg
          className="panel-icon-svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        <span className="panel-title">Asset Manager</span>
      </div>

      <div
        className={`drop-zone ${isDragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="upload-progress">
            <div className="upload-spinner" />
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

      <div className="section versions-section">
        <div className="section-label">Versions</div>
        <div className="version-list">
          {isLoading ? (
            <>
              <Skeleton className="skeleton-row" />
              <Skeleton className="skeleton-row" />
              <Skeleton className="skeleton-row" />
            </>
          ) : versions && versions.length > 0 ? (
            versions.map((v) => (
              <VersionItem
                key={v._id}
                version={v}
                isExpanded={activeVersion === v._id}
                onToggle={() => toggleExpand(v._id)}
                onRestore={(e) => handleRestore(e, v._id)}
                formatTime={formatTime}
              />
            ))
          ) : (
            <div className="empty-card">No versions yet</div>
          )}
        </div>
      </div>
    </div>
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
    api.example.getVersionPreview,
    isExpanded ? { versionId: version._id } : "skip",
  );

  return (
    <div
      className={`version-item ${version.state} ${isExpanded ? "expanded" : ""}`}
      onClick={onToggle}
    >
      <div className="version-item-header">
        <div className="version-info">
          <span className="version-number">v{version.version}</span>
          <span className={`version-state ${version.state}`}>
            {version.state}
          </span>
        </div>
        <div className="version-actions">
          <span className="version-date">{formatTime(version.createdAt)}</span>
          {version.state === "archived" && (
            <button className="restore-btn" onClick={onRestore}>
              Restore
            </button>
          )}
        </div>
      </div>
      <div className="version-item-preview">
        {isExpanded && previewData?.url && (
          <img src={previewData.url} alt={`Version ${version.version}`} />
        )}
        {isExpanded && !previewData?.url && (
          <Skeleton className="skeleton-image" />
        )}
      </div>
    </div>
  );
}

function ViewerPanel() {
  const currentImage = useQuery(api.example.getCurrentImage);
  const isLoading = currentImage === undefined;

  // Convex HTTP routes are served from .convex.site (not .convex.cloud)
  const siteUrl =
    (import.meta.env.VITE_CONVEX_URL as string)?.replace(".cloud", ".site") ||
    "";
  const stableUrl = `${siteUrl}/assets/demo/hero-image`;
  const versionUrl = currentImage?.versionId
    ? `${siteUrl}/assets/v/${currentImage.versionId}`
    : null;

  return (
    <div className="panel">
      <div className="panel-header">
        <svg
          className="panel-icon-svg"
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
        <span className="panel-title">Live Preview</span>
        <span className="live-badge">
          <span className="live-dot" />
          LIVE
        </span>
      </div>

      <div className="viewer-display">
        {isLoading ? (
          <Skeleton className="skeleton-viewer" />
        ) : currentImage ? (
          <div className="viewer-content">
            <img
              src={currentImage.url}
              alt="Published"
              className="viewer-image"
            />
          </div>
        ) : (
          <div className="viewer-empty">
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

      <div className="url-section">
        <div className="url-item">
          <div className="url-label">
            <strong>Stable URL</strong>
            <span>Always latest version</span>
          </div>
          <a
            href={stableUrl}
            target="_blank"
            rel="noopener"
            className="url-value"
          >
            {stableUrl}
          </a>
        </div>
        {versionUrl && (
          <div className="url-item">
            <div className="url-label">
              <strong>Version URL</strong>
              <span>Immutable v{currentImage?.version}</span>
            </div>
            <a
              href={versionUrl}
              target="_blank"
              rel="noopener"
              className="url-value"
            >
              {versionUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>convex-versioned-assets</h1>
        <p>Version history • Instant rollback • Direct CDN delivery</p>
      </header>
      <main className="main">
        <AdminPanel />
        <ViewerPanel />
      </main>
    </div>
  );
}

export default App;
