import posthog from "posthog-js";

export const EVENTS = {
  // Auth
  SIGNED_IN: "signed_in",
  SIGNED_OUT: "signed_out",

  // Onboarding
  API_KEY_SOURCE_SELECTED: "api_key_source_selected",
  DEFAULT_MODEL_SELECTED: "default_model_selected",
  SETTINGS_SAVED: "settings_saved",

  // Subscription & Payment
  PLAN_SELECTED: "plan_selected",
  CHECKOUT_INITIATED: "checkout_initiated",
  CREDIT_PURCHASED: "credit_purchased",
  PAYMENT_SUCCESS: "payment_success",
  BILLING_PORTAL_OPENED: "billing_portal_opened",

  // Deployment
  DEPLOY_INITIATED: "deploy_initiated",
  DEPLOYMENT_DEACTIVATED: "deployment_deactivated",
  DEPLOYMENT_REDEPLOYED: "deployment_redeployed",
  INSTANCE_RESTARTED: "instance_restarted",

  // Model Management
  MODEL_SWITCHED: "model_switched",
  CREDENTIALS_UPDATED: "credentials_updated",

  // Coupon
  COUPON_REDEEMED: "coupon_redeemed",

  // Blog
  BLOG_ARTICLE_CLICKED: "blog_article_clicked",

  // Misc
  TOKEN_COPIED: "token_copied",
} as const;

export function identify(userId: string, properties?: Record<string, unknown>) {
  posthog.identify(userId, properties);
}

export function reset() {
  posthog.reset();
}

export function capture(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}
