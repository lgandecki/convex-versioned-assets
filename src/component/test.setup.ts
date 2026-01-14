//
// @ts-expect-error-next-line - import.meta.glob is available in test environment (Vite)
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
