import { convexQuery } from "@convex-dev/react-query";
import { api as convexApi } from "../../../convex/_generated/api";

type API = typeof convexApi;

/**
 * Creates query options for the admin panel.
 * Takes the api object from context so we don't need direct imports.
 */
export function createQueries(api: API) {
  const va = api.versionedAssets;

  return {
    folders: (parentPath?: string) =>
      convexQuery(va.listFolders, { parentPath }),
    assets: (folderPath: string) =>
      convexQuery(va.listAssets, { folderPath }),
    publishedFilesInFolder: (folderPath: string) =>
      convexQuery(va.listPublishedFilesInFolder, { folderPath }),
    asset: (folderPath: string, basename: string) =>
      convexQuery(va.getAsset, { folderPath, basename }),
    assetVersions: (folderPath: string, basename: string) =>
      convexQuery(va.getAssetVersions, { folderPath, basename }),
    publishedFile: (folderPath: string, basename: string) =>
      convexQuery(va.getPublishedFile, { folderPath, basename }),
    versionPreviewUrl: (versionId: string) =>
      convexQuery(va.getVersionPreviewUrl, { versionId }),
  };
}
