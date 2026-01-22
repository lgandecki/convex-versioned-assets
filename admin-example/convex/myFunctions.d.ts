export declare const listNumbers: import("convex/server").RegisteredQuery<"public", {
    count: number;
}, Promise<{
    viewer: string | null;
    numbers: number[];
}>>;
export declare const addNumber: import("convex/server").RegisteredMutation<"public", {
    value: number;
}, Promise<void>>;
export declare const myAction: import("convex/server").RegisteredAction<"public", {
    first: number;
    second: string;
}, Promise<void>>;
//# sourceMappingURL=myFunctions.d.ts.map