export declare const auth: {
    getUserId: (ctx: {
        auth: import("convex/server").Auth;
    }) => Promise<import("convex/values").GenericId<"users"> | null>;
    getSessionId: (ctx: {
        auth: import("convex/server").Auth;
    }) => Promise<import("convex/values").GenericId<"authSessions"> | null>;
    addHttpRoutes: (http: import("convex/server").HttpRouter) => void;
}, signIn: import("convex/server").RegisteredAction<"public", {
    provider?: string | undefined;
    verifier?: string | undefined;
    refreshToken?: string | undefined;
    params?: any;
    calledBy?: string | undefined;
}, Promise<{
    redirect?: string;
    verifier?: string;
    tokens?: import("@convex-dev/auth/server").Tokens | null;
    started?: boolean;
}>>, signOut: import("convex/server").RegisteredAction<"public", {}, Promise<void>>, store: import("convex/server").RegisteredMutation<"internal", {
    args: {
        sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
        type: "signIn";
        userId: import("convex/values").GenericId<"users">;
        generateTokens: boolean;
    } | {
        type: "signOut";
    } | {
        type: "refreshSession";
        refreshToken: string;
    } | {
        provider?: string | undefined;
        verifier?: string | undefined;
        type: "verifyCodeAndSignIn";
        generateTokens: boolean;
        params: any;
        allowExtraProviders: boolean;
    } | {
        type: "verifier";
    } | {
        type: "verifierSignature";
        verifier: string;
        signature: string;
    } | {
        type: "userOAuth";
        profile: any;
        provider: string;
        providerAccountId: string;
        signature: string;
    } | {
        email?: string | undefined;
        phone?: string | undefined;
        accountId?: import("convex/values").GenericId<"authAccounts"> | undefined;
        type: "createVerificationCode";
        expirationTime: number;
        provider: string;
        code: string;
        allowExtraProviders: boolean;
    } | {
        shouldLinkViaEmail?: boolean | undefined;
        shouldLinkViaPhone?: boolean | undefined;
        type: "createAccountFromCredentials";
        profile: any;
        account: {
            secret?: string | undefined;
            id: string;
        };
        provider: string;
    } | {
        type: "retrieveAccountWithCredentials";
        account: {
            secret?: string | undefined;
            id: string;
        };
        provider: string;
    } | {
        type: "modifyAccount";
        account: {
            id: string;
            secret: string;
        };
        provider: string;
    } | {
        except?: import("convex/values").GenericId<"authSessions">[] | undefined;
        type: "invalidateSessions";
        userId: import("convex/values").GenericId<"users">;
    };
}, Promise<string | void | {
    userId: import("convex/values").GenericId<"users">;
    sessionId: import("convex/values").GenericId<"authSessions">;
} | {
    token: string;
    refreshToken: string;
} | {
    account: import("@convex-dev/auth/server").Doc<"authAccounts">;
    user: import("@convex-dev/auth/server").Doc<"users">;
} | null>>, isAuthenticated: import("convex/server").RegisteredQuery<"public", {}, Promise<boolean>>;
//# sourceMappingURL=auth.d.ts.map