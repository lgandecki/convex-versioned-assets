// Test modules loaded via Vite's import.meta.glob
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
