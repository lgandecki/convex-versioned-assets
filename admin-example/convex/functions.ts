/**
 * Custom function builders.
 *
 * Use these instead of importing directly from _generated/server:
 * - publicQuery: For queries that don't require auth
 * - publicMutation: For mutations that don't require auth (use sparingly)
 * - authedQuery/Mutation/Action: For logged-in users
 * - adminQuery/Mutation/Action: For admin-only operations
 */
import { v } from "convex/values";
import {
  query as baseQuery,
  mutation as baseMutation,
  action as baseAction,
  internalMutation as baseInternalMutation,
  internalAction as baseInternalAction,
  internalQuery as baseInternalQuery,
} from "./_generated/server";
import { customMutation, customAction, customQuery } from "convex-helpers/server/customFunctions";
import { requireIdentity, requireAdmin, principalId, isAdmin } from "./authz";

// ============================================================================
// Public functions (no auth required)
// ============================================================================

/**
 * Public query - no authentication required.
 * Accepts _adminKey for compatibility but ignores it.
 */
export const publicQuery = customQuery(baseQuery, {
  args: { _adminKey: v.optional(v.string()) },
  input: async () => ({ ctx: {}, args: {} }),
});

/**
 * Public mutation - no authentication required.
 * Use sparingly - only for truly public operations.
 */
export const publicMutation = customMutation(baseMutation, {
  args: { _adminKey: v.optional(v.string()) },
  input: async () => ({ ctx: {}, args: {} }),
});

/**
 * Public action - no authentication required.
 */
export const publicAction = customAction(baseAction, {
  args: { _adminKey: v.optional(v.string()) },
  input: async () => ({ ctx: {}, args: {} }),
});

// ============================================================================
// Internal functions (re-exported unchanged)
// ============================================================================

export const internalMutation = baseInternalMutation;
export const internalAction = baseInternalAction;
export const internalQuery = baseInternalQuery;

// ============================================================================
// Authed functions (require login)
// ============================================================================

/**
 * Authed query - requires user to be logged in.
 */
export const authedQuery = customQuery(baseQuery, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireIdentity(ctx, _adminKey);
    return {
      ctx: { principalId: principalId(identity), isAdmin: isAdmin(identity) },
      args: {},
    };
  },
});

/**
 * Authed mutation - requires user to be logged in.
 */
export const authedMutation = customMutation(baseMutation, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireIdentity(ctx, _adminKey);
    return {
      ctx: { principalId: principalId(identity), isAdmin: isAdmin(identity) },
      args: {},
    };
  },
});

/**
 * Authed action - requires user to be logged in.
 */
export const authedAction = customAction(baseAction, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireIdentity(ctx, _adminKey);
    return {
      ctx: { principalId: principalId(identity), isAdmin: isAdmin(identity) },
      args: {},
    };
  },
});

/**
 * Context available in authed function handlers.
 */
export interface AuthedCtx {
  principalId: string;
  isAdmin: boolean;
}

// ============================================================================
// Admin functions (require admin role)
// ============================================================================

/**
 * Admin query - requires user to be an admin.
 */
export const adminQuery = customQuery(baseQuery, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireAdmin(ctx, _adminKey);
    return { ctx: { principalId: principalId(identity) }, args: {} };
  },
});

/**
 * Admin mutation - requires user to be an admin.
 */
export const adminMutation = customMutation(baseMutation, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireAdmin(ctx, _adminKey);
    return { ctx: { principalId: principalId(identity) }, args: {} };
  },
});

/**
 * Admin action - requires user to be an admin.
 */
export const adminAction = customAction(baseAction, {
  args: { _adminKey: v.optional(v.string()) },
  input: async (ctx, { _adminKey }) => {
    const identity = await requireAdmin(ctx, _adminKey);
    return { ctx: { principalId: principalId(identity) }, args: {} };
  },
});

/**
 * Context available in admin function handlers.
 */
export interface AdminCtx {
  principalId: string;
}
