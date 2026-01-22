import { describe, it, expect } from "vitest";
import {
  isDefaultHttpTemplate,
  transformHttpTs,
  hasVersionedAssetsRoutes,
} from "./httpTransform";

describe("isDefaultHttpTemplate", () => {
  it("matches the exact default template", () => {
    const content = `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;`;
    expect(isDefaultHttpTemplate(content)).toBe(true);
  });

  it("matches template without semicolons", () => {
    const content = `import { httpRouter } from "convex/server"
import { auth } from "./auth"

const http = httpRouter()

auth.addHttpRoutes(http)

export default http`;
    expect(isDefaultHttpTemplate(content)).toBe(true);
  });

  it("matches template with different spacing", () => {
    const content = `import {httpRouter} from "convex/server";
import {auth} from "./auth";
const http=httpRouter();
auth.addHttpRoutes(http);
export default http;`;
    expect(isDefaultHttpTemplate(content)).toBe(true);
  });

  it("matches template with single quotes", () => {
    const content = `import { httpRouter } from 'convex/server';
import { auth } from './auth';

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;`;
    expect(isDefaultHttpTemplate(content)).toBe(true);
  });

  it("rejects template with extra imports", () => {
    const content = `import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { something } from "./other";

const http = httpRouter();
auth.addHttpRoutes(http);
export default http;`;
    expect(isDefaultHttpTemplate(content)).toBe(false);
  });

  it("rejects template with extra function calls", () => {
    const content = `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
doSomethingElse(http);
export default http;`;
    expect(isDefaultHttpTemplate(content)).toBe(false);
  });

  it("rejects template with different variable name", () => {
    const content = `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const router = httpRouter();
auth.addHttpRoutes(router);
export default router;`;
    expect(isDefaultHttpTemplate(content)).toBe(false);
  });

  it("rejects template without auth import", () => {
    const content = `import { httpRouter } from "convex/server";

const http = httpRouter();

export default http;`;
    expect(isDefaultHttpTemplate(content)).toBe(false);
  });

  it("rejects template with registerAssetFsRoutes already added", () => {
    const content = `import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { registerAssetFsRoutes } from "convex-versioned-assets";
import { components } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);
registerAssetFsRoutes(http, components.versionedAssets);

export default http;`;
    expect(isDefaultHttpTemplate(content)).toBe(false);
  });
});

describe("transformHttpTs", () => {
  it("injects imports and registerAssetFsRoutes call", () => {
    const input = `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;`;

    const result = transformHttpTs(input);
    expect(result.success).toBe(true);
    expect(result.transformed).toContain('import { registerAssetFsRoutes }');
    expect(result.transformed).toContain('import { components }');
    expect(result.transformed).toContain("registerAssetFsRoutes(http, components.versionedAssets)");
  });

  it("preserves original code structure", () => {
    const input = `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;`;

    const result = transformHttpTs(input);
    expect(result.success).toBe(true);
    expect(result.transformed).toContain("auth.addHttpRoutes(http)");
    expect(result.transformed).toContain("const http = httpRouter()");
    expect(result.transformed).toContain("export default http");
  });

  it("adds comment before registerAssetFsRoutes", () => {
    const input = `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;`;

    const result = transformHttpTs(input);
    expect(result.success).toBe(true);
    expect(result.transformed).toContain("// Asset serving routes");
  });

  it("returns failure for non-default templates", () => {
    const input = `import { httpRouter } from "convex/server";
import { customThing } from "./custom";

const http = httpRouter();
customThing.setup(http);
export default http;`;

    const result = transformHttpTs(input);
    expect(result.success).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain("does not match");
  });

  it("returns failure for empty content", () => {
    const result = transformHttpTs("");
    expect(result.success).toBe(false);
  });

  it("returns failure for invalid TypeScript", () => {
    const input = `this is not valid typescript {{{`;
    const result = transformHttpTs(input);
    expect(result.success).toBe(false);
  });
});

describe("hasVersionedAssetsRoutes", () => {
  it("detects import from convex-versioned-assets", () => {
    const content = `import { httpRouter } from "convex/server";
import { registerAssetFsRoutes } from "convex-versioned-assets";

const http = httpRouter();
export default http;`;
    expect(hasVersionedAssetsRoutes(content)).toBe(true);
  });

  it("detects registerAssetFsRoutes call", () => {
    const content = `import { httpRouter } from "convex/server";

const http = httpRouter();
registerAssetFsRoutes(http, components.versionedAssets);
export default http;`;
    expect(hasVersionedAssetsRoutes(content)).toBe(true);
  });

  it("returns false for clean template", () => {
    const content = `import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
export default http;`;
    expect(hasVersionedAssetsRoutes(content)).toBe(false);
  });

  it("returns false for empty content", () => {
    expect(hasVersionedAssetsRoutes("")).toBe(false);
  });
});
