/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _testInsertFakeFile from "../_testInsertFakeFile.js";
import type * as allocateFolderSegment from "../allocateFolderSegment.js";
import type * as assetFsHttp from "../assetFsHttp.js";
import type * as assetManager from "../assetManager.js";
import type * as authAdapter from "../authAdapter.js";
import type * as changelog from "../changelog.js";
import type * as helpers_changelog from "../helpers/changelog.js";
import type * as internalMutations from "../internalMutations.js";
import type * as internalQueries from "../internalQueries.js";
import type * as migration from "../migration.js";
import type * as r2Client from "../r2Client.js";
import type * as signedUrl from "../signedUrl.js";
import type * as slugify from "../slugify.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  _testInsertFakeFile: typeof _testInsertFakeFile;
  allocateFolderSegment: typeof allocateFolderSegment;
  assetFsHttp: typeof assetFsHttp;
  assetManager: typeof assetManager;
  authAdapter: typeof authAdapter;
  changelog: typeof changelog;
  "helpers/changelog": typeof helpers_changelog;
  internalMutations: typeof internalMutations;
  internalQueries: typeof internalQueries;
  migration: typeof migration;
  r2Client: typeof r2Client;
  signedUrl: typeof signedUrl;
  slugify: typeof slugify;
  validators: typeof validators;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
