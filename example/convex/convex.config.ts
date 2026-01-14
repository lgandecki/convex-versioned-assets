import { defineApp } from "convex/server";
import convexVersionedAssets from "convex-versioned-assets/convex.config.js";

const app = defineApp();
app.use(convexVersionedAssets);

export default app;
