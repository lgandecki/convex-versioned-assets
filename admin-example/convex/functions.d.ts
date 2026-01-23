/**
 * Public query - no authentication required.
 * Accepts _adminKey for compatibility but ignores it.
 */
export declare const publicQuery: import("convex-helpers/server/customFunctions").CustomBuilder<"query", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {}, {}, import("convex/server").GenericQueryCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
/**
 * Public mutation - no authentication required.
 * Use sparingly - only for truly public operations.
 */
export declare const publicMutation: import("convex-helpers/server/customFunctions").CustomBuilder<"mutation", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {}, {}, import("convex/server").GenericMutationCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
/**
 * Public action - no authentication required.
 */
export declare const publicAction: import("convex-helpers/server/customFunctions").CustomBuilder<"action", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {}, {}, import("convex/server").GenericActionCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
export declare const internalMutation: import("convex/server").MutationBuilder<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}, "internal">;
export declare const internalAction: import("convex/server").ActionBuilder<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}, "internal">;
export declare const internalQuery: import("convex/server").QueryBuilder<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}, "internal">;
/**
 * Authed query - requires user to be logged in.
 */
export declare const authedQuery: import("convex-helpers/server/customFunctions").CustomBuilder<"query", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {
    principalId: string;
    isAdmin: boolean;
}, {}, import("convex/server").GenericQueryCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
/**
 * Authed mutation - requires user to be logged in.
 */
export declare const authedMutation: import("convex-helpers/server/customFunctions").CustomBuilder<"mutation", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {
    principalId: string;
    isAdmin: boolean;
}, {}, import("convex/server").GenericMutationCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
/**
 * Authed action - requires user to be logged in.
 */
export declare const authedAction: import("convex-helpers/server/customFunctions").CustomBuilder<"action", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {
    principalId: string;
    isAdmin: boolean;
}, {}, import("convex/server").GenericActionCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
/**
 * Context available in authed function handlers.
 */
export interface AuthedCtx {
    principalId: string;
    isAdmin: boolean;
}
/**
 * Admin query - requires user to be an admin.
 */
export declare const adminQuery: import("convex-helpers/server/customFunctions").CustomBuilder<"query", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {
    principalId: string;
}, {}, import("convex/server").GenericQueryCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
/**
 * Admin mutation - requires user to be an admin.
 */
export declare const adminMutation: import("convex-helpers/server/customFunctions").CustomBuilder<"mutation", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {
    principalId: string;
}, {}, import("convex/server").GenericMutationCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
/**
 * Admin action - requires user to be an admin.
 */
export declare const adminAction: import("convex-helpers/server/customFunctions").CustomBuilder<"action", {
    _adminKey: import("convex/values").VString<string | undefined, "optional">;
}, {
    principalId: string;
}, {}, import("convex/server").GenericActionCtx<{
    numbers: {
        document: {
            _id: import("convex/values").GenericId<"numbers">;
            _creationTime: number;
            value: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "value");
        indexes: {
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    users: {
        document: {
            _id: import("convex/values").GenericId<"users">;
            _creationTime: number;
            name?: string | undefined | undefined;
            email?: string | undefined | undefined;
            phone?: string | undefined | undefined;
            image?: string | undefined | undefined;
            emailVerificationTime?: number | undefined | undefined;
            phoneVerificationTime?: number | undefined | undefined;
            isAnonymous?: boolean | undefined | undefined;
        };
        fieldPaths: "_id" | ("name" | "email" | "_creationTime" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous");
        indexes: {
            email: ["email", "_creationTime"];
            phone: ["phone", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authSessions: {
        document: {
            _id: import("convex/values").GenericId<"authSessions">;
            _creationTime: number;
            userId: import("convex/values").GenericId<"users">;
            expirationTime: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "userId" | "expirationTime");
        indexes: {
            userId: ["userId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authAccounts: {
        document: {
            _id: import("convex/values").GenericId<"authAccounts">;
            _creationTime: number;
            secret?: string | undefined | undefined;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            userId: import("convex/values").GenericId<"users">;
            provider: string;
            providerAccountId: string;
        };
        fieldPaths: "_id" | ("secret" | "_creationTime" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified");
        indexes: {
            userIdAndProvider: ["userId", "provider", "_creationTime"];
            providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRefreshTokens: {
        document: {
            _id: import("convex/values").GenericId<"authRefreshTokens">;
            _creationTime: number;
            firstUsedTime?: number | undefined | undefined;
            parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
            expirationTime: number;
            sessionId: import("convex/values").GenericId<"authSessions">;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId");
        indexes: {
            sessionId: ["sessionId", "_creationTime"];
            sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerificationCodes: {
        document: {
            _id: import("convex/values").GenericId<"authVerificationCodes">;
            _creationTime: number;
            emailVerified?: string | undefined | undefined;
            phoneVerified?: string | undefined | undefined;
            verifier?: string | undefined | undefined;
            expirationTime: number;
            provider: string;
            accountId: import("convex/values").GenericId<"authAccounts">;
            code: string;
        };
        fieldPaths: "_id" | ("_creationTime" | "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier");
        indexes: {
            accountId: ["accountId", "_creationTime"];
            code: ["code", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authVerifiers: {
        document: {
            _id: import("convex/values").GenericId<"authVerifiers">;
            _creationTime: number;
            sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
            signature?: string | undefined | undefined;
        };
        fieldPaths: "_id" | ("_creationTime" | "sessionId" | "signature");
        indexes: {
            signature: ["signature", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
    authRateLimits: {
        document: {
            _id: import("convex/values").GenericId<"authRateLimits">;
            _creationTime: number;
            identifier: string;
            lastAttemptTime: number;
            attemptsLeft: number;
        };
        fieldPaths: "_id" | ("_creationTime" | "identifier" | "lastAttemptTime" | "attemptsLeft");
        indexes: {
            identifier: ["identifier", "_creationTime"];
            by_id: ["_id"];
            by_creation_time: ["_creationTime"];
        };
        searchIndexes: {};
        vectorIndexes: {};
    };
}>, "public", object>;
/**
 * Context available in admin function handlers.
 */
export interface AdminCtx {
    principalId: string;
}
//# sourceMappingURL=functions.d.ts.map