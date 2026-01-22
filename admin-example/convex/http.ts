import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { registerAssetFsRoutes } from "convex-versioned-assets";
import { components } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);
// Asset serving routes - serves files at /am/file/v/{versionId}

registerAssetFsRoutes(http, components.versionedAssets);


export default http;
