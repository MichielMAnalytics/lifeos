/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminCleanup from "../adminCleanup.js";
import type * as adminExportImport from "../adminExportImport.js";
import type * as apiKeyAuth from "../apiKeyAuth.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as context from "../context.js";
import type * as coupons from "../coupons.js";
import type * as crons from "../crons.js";
import type * as currentUser from "../currentUser.js";
import type * as dashboardConfig from "../dashboardConfig.js";
import type * as dayPlans from "../dayPlans.js";
import type * as deploymentActions from "../deploymentActions.js";
import type * as deploymentEnv from "../deploymentEnv.js";
import type * as deploymentHealthCheck from "../deploymentHealthCheck.js";
import type * as deploymentQueries from "../deploymentQueries.js";
import type * as deploymentSettings from "../deploymentSettings.js";
import type * as feedback from "../feedback.js";
import type * as financeAi from "../financeAi.js";
import type * as financeCategories from "../financeCategories.js";
import type * as financeFx from "../financeFx.js";
import type * as financeImport from "../financeImport.js";
import type * as financeParsers from "../financeParsers.js";
import type * as financeStatements from "../financeStatements.js";
import type * as financeTransactions from "../financeTransactions.js";
import type * as foodLog from "../foodLog.js";
import type * as fxRates from "../fxRates.js";
import type * as gatewayBridge from "../gatewayBridge.js";
import type * as goals from "../goals.js";
import type * as granola from "../granola.js";
import type * as granolaDebug from "../granolaDebug.js";
import type * as granolaHelpers from "../granolaHelpers.js";
import type * as granolaSync from "../granolaSync.js";
import type * as http from "../http.js";
import type * as ideas from "../ideas.js";
import type * as identity from "../identity.js";
import type * as journals from "../journals.js";
import type * as k8s from "../k8s.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as macroGoals from "../macroGoals.js";
import type * as meetings from "../meetings.js";
import type * as merchantMemory from "../merchantMemory.js";
import type * as modelProxy from "../modelProxy.js";
import type * as mutationLog from "../mutationLog.js";
import type * as openaiDeviceAuth from "../openaiDeviceAuth.js";
import type * as openaiOAuthLock from "../openaiOAuthLock.js";
import type * as programmes from "../programmes.js";
import type * as projects from "../projects.js";
import type * as reminderDispatch from "../reminderDispatch.js";
import type * as reminderHelpers from "../reminderHelpers.js";
import type * as reminders from "../reminders.js";
import type * as resolveId from "../resolveId.js";
import type * as resources from "../resources.js";
import type * as reviews from "../reviews.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as skills from "../skills.js";
import type * as stripe from "../stripe.js";
import type * as stripeCheckout from "../stripeCheckout.js";
import type * as tasks from "../tasks.js";
import type * as thoughts from "../thoughts.js";
import type * as transcribe from "../transcribe.js";
import type * as triggers from "../triggers.js";
import type * as userProfile from "../userProfile.js";
import type * as visionBoard from "../visionBoard.js";
import type * as weeklyPlans from "../weeklyPlans.js";
import type * as wins from "../wins.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminCleanup: typeof adminCleanup;
  adminExportImport: typeof adminExportImport;
  apiKeyAuth: typeof apiKeyAuth;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  context: typeof context;
  coupons: typeof coupons;
  crons: typeof crons;
  currentUser: typeof currentUser;
  dashboardConfig: typeof dashboardConfig;
  dayPlans: typeof dayPlans;
  deploymentActions: typeof deploymentActions;
  deploymentEnv: typeof deploymentEnv;
  deploymentHealthCheck: typeof deploymentHealthCheck;
  deploymentQueries: typeof deploymentQueries;
  deploymentSettings: typeof deploymentSettings;
  feedback: typeof feedback;
  financeAi: typeof financeAi;
  financeCategories: typeof financeCategories;
  financeFx: typeof financeFx;
  financeImport: typeof financeImport;
  financeParsers: typeof financeParsers;
  financeStatements: typeof financeStatements;
  financeTransactions: typeof financeTransactions;
  foodLog: typeof foodLog;
  fxRates: typeof fxRates;
  gatewayBridge: typeof gatewayBridge;
  goals: typeof goals;
  granola: typeof granola;
  granolaDebug: typeof granolaDebug;
  granolaHelpers: typeof granolaHelpers;
  granolaSync: typeof granolaSync;
  http: typeof http;
  ideas: typeof ideas;
  identity: typeof identity;
  journals: typeof journals;
  k8s: typeof k8s;
  "lib/helpers": typeof lib_helpers;
  macroGoals: typeof macroGoals;
  meetings: typeof meetings;
  merchantMemory: typeof merchantMemory;
  modelProxy: typeof modelProxy;
  mutationLog: typeof mutationLog;
  openaiDeviceAuth: typeof openaiDeviceAuth;
  openaiOAuthLock: typeof openaiOAuthLock;
  programmes: typeof programmes;
  projects: typeof projects;
  reminderDispatch: typeof reminderDispatch;
  reminderHelpers: typeof reminderHelpers;
  reminders: typeof reminders;
  resolveId: typeof resolveId;
  resources: typeof resources;
  reviews: typeof reviews;
  search: typeof search;
  seed: typeof seed;
  skills: typeof skills;
  stripe: typeof stripe;
  stripeCheckout: typeof stripeCheckout;
  tasks: typeof tasks;
  thoughts: typeof thoughts;
  transcribe: typeof transcribe;
  triggers: typeof triggers;
  userProfile: typeof userProfile;
  visionBoard: typeof visionBoard;
  weeklyPlans: typeof weeklyPlans;
  wins: typeof wins;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  stripe: {
    private: {
      handleCheckoutSessionCompleted: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          mode: string;
          stripeCheckoutSessionId: string;
          stripeCustomerId?: string;
        },
        null
      >;
      handleCustomerCreated: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        null
      >;
      handleCustomerUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        null
      >;
      handleInvoiceCreated: FunctionReference<
        "mutation",
        "internal",
        {
          amountDue: number;
          amountPaid: number;
          created: number;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
        },
        null
      >;
      handleInvoicePaid: FunctionReference<
        "mutation",
        "internal",
        { amountPaid: number; stripeInvoiceId: string },
        null
      >;
      handleInvoicePaymentFailed: FunctionReference<
        "mutation",
        "internal",
        { stripeInvoiceId: string },
        null
      >;
      handlePaymentIntentSucceeded: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
        },
        null
      >;
      handleSubscriptionCreated: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
        },
        null
      >;
      handleSubscriptionDeleted: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAt?: number;
          cancelAtPeriodEnd?: boolean;
          currentPeriodEnd?: number;
          stripeSubscriptionId: string;
        },
        null
      >;
      handleSubscriptionUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          priceId?: string;
          quantity?: number;
          status: string;
          stripeSubscriptionId: string;
        },
        null
      >;
      listSubscriptionsWithCreationTime: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          _creationTime: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
        }>
      >;
      updatePaymentCustomer: FunctionReference<
        "mutation",
        "internal",
        { stripeCustomerId: string; stripePaymentIntentId: string },
        null
      >;
      updateSubscriptionQuantityInternal: FunctionReference<
        "mutation",
        "internal",
        { quantity: number; stripeSubscriptionId: string },
        null
      >;
    };
    public: {
      createOrUpdateCustomer: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        string
      >;
      getCheckoutSession: FunctionReference<
        "query",
        "internal",
        { stripeCheckoutSessionId: string },
        {
          metadata?: any;
          mode: string;
          status: string;
          stripeCheckoutSessionId: string;
          stripeCustomerId?: string;
        } | null
      >;
      getCustomer: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
          userId?: string;
        } | null
      >;
      getCustomerByEmail: FunctionReference<
        "query",
        "internal",
        { email: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
          userId?: string;
        } | null
      >;
      getCustomerByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
          userId?: string;
        } | null
      >;
      getPayment: FunctionReference<
        "query",
        "internal",
        { stripePaymentIntentId: string },
        {
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        } | null
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { stripeSubscriptionId: string },
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        } | null
      >;
      getSubscriptionByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        } | null
      >;
      listCheckoutSessions: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          metadata?: any;
          mode: string;
          status: string;
          stripeCheckoutSessionId: string;
          stripeCustomerId?: string;
        }>
      >;
      listInvoices: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listInvoicesByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listInvoicesByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listPayments: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listPaymentsByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listPaymentsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listSubscriptions: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      listSubscriptionsByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      listSubscriptionsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      updateSubscriptionMetadata: FunctionReference<
        "mutation",
        "internal",
        {
          metadata: any;
          orgId?: string;
          stripeSubscriptionId: string;
          userId?: string;
        },
        null
      >;
      updateSubscriptionQuantity: FunctionReference<
        "action",
        "internal",
        { quantity: number; stripeSubscriptionId: string },
        null
      >;
    };
  };
};
