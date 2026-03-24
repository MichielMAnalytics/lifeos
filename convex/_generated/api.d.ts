/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeyAuth from "../apiKeyAuth.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as currentUser from "../currentUser.js";
import type * as dashboardConfig from "../dashboardConfig.js";
import type * as dayPlans from "../dayPlans.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as ideas from "../ideas.js";
import type * as journals from "../journals.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as mutationLog from "../mutationLog.js";
import type * as projects from "../projects.js";
import type * as reminders from "../reminders.js";
import type * as resources from "../resources.js";
import type * as reviews from "../reviews.js";
import type * as search from "../search.js";
import type * as tasks from "../tasks.js";
import type * as thoughts from "../thoughts.js";
import type * as triggers from "../triggers.js";
import type * as weeklyPlans from "../weeklyPlans.js";
import type * as wins from "../wins.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeyAuth: typeof apiKeyAuth;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  currentUser: typeof currentUser;
  dashboardConfig: typeof dashboardConfig;
  dayPlans: typeof dayPlans;
  goals: typeof goals;
  http: typeof http;
  ideas: typeof ideas;
  journals: typeof journals;
  "lib/helpers": typeof lib_helpers;
  mutationLog: typeof mutationLog;
  projects: typeof projects;
  reminders: typeof reminders;
  resources: typeof resources;
  reviews: typeof reviews;
  search: typeof search;
  tasks: typeof tasks;
  thoughts: typeof thoughts;
  triggers: typeof triggers;
  weeklyPlans: typeof weeklyPlans;
  wins: typeof wins;
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

export declare const components: {};
