'use client';

import { useState, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Shield,
  Server,
  Lock,
  Key,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Plus,
  EyeOff,
  KeyRound,
  CloudCog,
  Zap,
} from "lucide-react";
import { MODELS } from "@/components/ai-agent/types";
import { capture, EVENTS } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const TESTIMONIALS = [
  { name: "Marco", role: "Backend Engineer", quote: "Replaced Notion, Todoist, and a journal app with ", highlight: "one dashboard that actually connects everything", quoteTail: ". My morning routine is 10 minutes now.", color: "#6366f1" },
  { name: "Priya", role: "Freelance Developer", quote: "The AI agent on Telegram ", highlight: "checks in on my goals while I sleep", quoteTail: ". I wake up to a briefing, not a blank page.", color: "#f59e0b" },
  { name: "Thomas", role: "CTO, 4-person startup", quote: "Seven persona presets means ", highlight: "I flip between founder mode and deep-work mode", quoteTail: " in one click. Huge productivity boost.", color: "#10b981" },
  { name: "Lena", role: "Product Manager", quote: "Not technical at all. Signed in with Google, picked the minimalist theme, and ", highlight: "had my whole week planned before coffee was ready", quoteTail: ".", color: "#ec4899" },
  { name: "Daniel", role: "Security Consultant", quote: "Finally a life OS that ", highlight: "keeps data private and encrypted by default", quoteTail: ". No shared databases, no snooping.", color: "#8b5cf6" },
  { name: "Sofia", role: "Agency Owner", quote: "Tasks, goals, journal, reviews -- ", highlight: "all in one place with real-time sync", quoteTail: ". I stopped context-switching between 5 apps.", color: "#06b6d4" },
];

const PRICING_TIERS = [
  {
    id: "byok",
    name: "BYOK",
    price: 20,
    badge: "7 days free",
    description: "Bring your own API keys -- no markup on AI costs.",
    cta: "Start 7-day trial",
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: 30,
    badge: null,
    description: "Includes EUR 10 in model credits each month.",
    cta: "Subscribe",
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: 45,
    badge: "Popular",
    description: "Includes EUR 25 in model credits each month.",
    cta: "Subscribe",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 75,
    badge: null,
    description: "Includes EUR 55 in model credits each month.",
    cta: "Subscribe",
    popular: false,
  },
];

const COMPARISON_ROWS = [
  { id: "setup", label: "Setup time" },
  { id: "secret_mgmt", label: "Secret management" },
  { id: "encryption", label: "Encryption at rest" },
  { id: "isolation", label: "Network isolation" },
  { id: "patching", label: "Security patching" },
  { id: "access", label: "Access controls" },
  { id: "audit", label: "Audit trail" },
  { id: "byok", label: "Bring your own key" },
  { id: "integrations", label: "Integrations" },
  { id: "price", label: "Price / mo" },
];

type ProviderValues = Record<string, string>;

const FIXED_PROVIDERS: { id: string; name: string; highlight?: boolean; values: ProviderValues }[] = [
  { id: "selfhost", name: "Self-host", values: { setup: "4\u20136 hours", secret_mgmt: ".env files", encryption: "no", isolation: "no", patching: "Manual", access: "no", audit: "no", byok: "yes", integrations: "All (manual setup)", price: "$0 + your time" } },
  { id: "azin", name: "LifeOS", highlight: true, values: { setup: "120 seconds", secret_mgmt: "Secret Manager + CMEK", encryption: "yes", isolation: "yes", patching: "Automatic (GKE)", access: "Google OAuth", audit: "yes", byok: "yes", integrations: "All channels + full UI", price: "From \u20AC20" } },
];

const OPTIONAL_PROVIDERS: { id: string; name: string; values: ProviderValues }[] = [
  { id: "myclaw", name: "MyClaw.ai", values: { setup: "30 seconds", secret_mgmt: "Not disclosed", encryption: "Claimed, unspecified", isolation: "Isolated container", patching: "Automatic", access: "Not disclosed", audit: "no", byok: "no", integrations: "All channels + web terminal", price: "$9\u201329" } },
  { id: "simpleclaw", name: "SimpleClaw", values: { setup: "< 1 minute", secret_mgmt: "no", encryption: "no", isolation: "no", patching: "no", access: "yes", audit: "no", byok: "no", integrations: "Telegram only", price: "$49" } },
  { id: "clawdhost", name: "ClawdHost", values: { setup: "1 minute", secret_mgmt: "AES-256 encrypted", encryption: "Not disclosed", isolation: "Isolated VPS", patching: "Automatic", access: "Account login", audit: "no", byok: "yes", integrations: "WhatsApp, Telegram, Discord, Slack", price: "$25" } },
  { id: "openclawd", name: "Self-host (advanced)", values: { setup: "10\u201315 min", secret_mgmt: "Local files", encryption: "no", isolation: "Local machine", patching: "Manual", access: "Local only", audit: "no", byok: "yes", integrations: "All (100+ skills)", price: "$5\u201350 (API only)" } },
  { id: "clawbook", name: "ClawBook", values: { setup: "< 5 minutes", secret_mgmt: "Encrypted on server", encryption: "SSL/TLS only", isolation: "Docker container", patching: "Automatic", access: "SSH + pairing code", audit: "no", byok: "yes", integrations: "12+ channels", price: "$20\u201360" } },
];

const SECURITY_PILLARS = [
  { icon: Server, title: "Pod-level isolation", summary: "Every user gets a dedicated Kubernetes StatefulSet \u2014 a full, isolated container with its own 5GB encrypted persistent volume.", detail: "This is not a shared multi-tenant process. It\u2019s a full, isolated container running the AI agent binary. Your data never shares storage or memory with another user." },
  { icon: Shield, title: "Zero-trust networking", summary: "Default-deny ingress on every namespace. All private IP ranges blocked \u2014 no lateral movement between pods.", detail: "User pods can only talk to DNS, the AI Gateway, and the public internet. All private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) are blocked." },
  { icon: Lock, title: "Encryption everywhere", summary: "CMEK via Google Cloud KMS with 90-day auto-rotation. Each instance gets its own TLS certificate via Let\u2019s Encrypt.", detail: "Both etcd (cluster state) and persistent disks use Customer-Managed Encryption Keys. In-transit encryption via Let\u2019s Encrypt + cert-manager." },
  { icon: Key, title: "Owner-only access", summary: "Each instance is bound to your Google account at the infrastructure level. No shared access, no admin backdoors.", detail: "Google OAuth authentication via oauth2-proxy. The AI Gateway verifies both that you\u2019re authenticated AND that you\u2019re the owner." },
  { icon: ShieldCheck, title: "Enterprise secret management", summary: "API keys stored in Google Cloud Secret Manager \u2014 not in Kubernetes secrets, not in environment variables.", detail: "BYOK API keys go directly to Secret Manager\u2019s enterprise-grade vault. Pod secrets are cryptographically generated per-deployment." },
  { icon: CloudCog, title: "Google-managed node security", summary: "GKE Autopilot handles OS patching, container runtime hardening, and node security. Container-Optimized OS on every node.", detail: "Workload Identity Federation means no static GCP credentials on any pod. The AI Gateway authenticates to Google Cloud via OIDC token exchange, not service account key files." },
  { icon: Zap, title: "Rate limiting & cost controls", summary: "Per-pod rate limiting at 100 req/min via Redis. Pre-flight balance checks before every API call.", detail: "Rate limiting prevents abuse. Balance verification happens before each call \u2014 no runaway costs. Automatic suspension at zero balance." },
];

const FAQ_ITEMS = [
  {
    question: "How are my API keys handled?",
    answer: "Your API keys are stored in Google Cloud Secret Manager -- Google's enterprise-grade secret vault. Keys are never injected as environment variables, never logged, and the agent runtime never sees them directly. The AI gateway retrieves them per-request via a secure internal API.",
    link: { text: "Read our security architecture", href: "https://lifeos.zone/blog/security-architecture" },
  },
  {
    question: "Can I use my own API key?",
    answer: "Yes. You can bring your own OpenAI, Anthropic, or Google AI key (BYOK), or use our provisioned key with no setup required. BYOK mode gives you full control over rate limits and billing directly with the provider.",
  },
  {
    question: "How is my instance isolated from other users?",
    answer: "Every user gets their own dedicated Kubernetes pod -- not a shared container, not a multi-tenant process. Network policies enforce default-deny ingress. Your pod has its own encrypted storage volume, its own TLS certificate, and its own set of secrets. There is no shared state between pods.",
    link: { text: "See isolation details", href: "https://lifeos.zone/blog/security-architecture" },
  },
  {
    question: "What happens when the AI agent updates?",
    answer: "Your instance is automatically updated to the latest release with zero downtime. We use a rolling update strategy: first the new image is pulled, then your pod is gracefully restarted with the updated configuration. You don't need to do anything.",
  },
  {
    question: "How much does it cost?",
    answer: "Plans start at EUR 20/mo (BYOK) and go up to EUR 75/mo (Premium with EUR 55 in credits). All plans include managed hosting, automatic updates, and full pod isolation. The BYOK plan includes a 7-day free trial. You can cancel anytime.",
    link: { text: "View pricing", href: "#pricing" },
  },
];

const SOCIAL_PROOF_AVATARS = [
  { initials: "M", color: "#6366f1" },
  { initials: "P", color: "#f59e0b" },
  { initials: "T", color: "#10b981" },
  { initials: "L", color: "#ec4899" },
  { initials: "D", color: "#8b5cf6" },
];

// ---------------------------------------------------------------------------
// GitHub SVG icon (inline to avoid extra dependency)
// ---------------------------------------------------------------------------

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SectionHeading({
  badge,
  title,
  titleMuted,
  subtitle,
  id,
  blogLink,
}: {
  badge?: string;
  title: string;
  titleMuted?: string;
  subtitle?: string;
  id?: string;
  blogLink?: { text: string; href: string };
}) {
  return (
    <motion.div
      className="text-center mb-14"
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
    >
      {badge && (
        <span className="inline-flex items-center h-7 px-3 text-[11px] font-heading text-text-muted border border-text/10 rounded-full mb-5">
          {badge}
        </span>
      )}
      <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.02em] leading-[1.1] font-heading">
        {title}
        {titleMuted && (
          <>
            <br />
            <span className="text-text-muted">{titleMuted}</span>
          </>
        )}
      </h2>
      {subtitle && (
        <p className="text-sm text-text-muted max-w-xl mx-auto leading-relaxed mt-4 font-heading">
          {subtitle}
        </p>
      )}
      {blogLink && (
        <a
          href={blogLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-accent hover:text-accent/80 transition-colors mt-3"
        >
          {blogLink.text}
        </a>
      )}
    </motion.div>
  );
}

function CellValue({ value, highlighted }: { value: string; highlighted?: boolean }) {
  if (value === "yes") {
    return (
      <svg className="w-[18px] h-[18px] text-success mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (value === "no") {
    return (
      <svg className="w-4 h-4 text-danger/70 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return (
    <span className={`text-[12px] font-heading ${highlighted ? "text-accent" : "text-text/80"}`}>
      {value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LandingPage() {
  const { signIn } = useAuthActions();
  const [autoSigningIn, setAutoSigningIn] = useState(false);

  // Handle ?plan= or ?model= auto-sign-in the same way the original SignIn did
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("plan") || params.has("model")) {
      setAutoSigningIn(true);
      capture(EVENTS.SIGNED_IN, { method: "google", auto: true });
      void signIn("google");
    }
  }, [signIn]);

  if (autoSigningIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg">
        <Loader2 className="size-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg overflow-x-hidden">
      <HeroSection />
      <VideoSection />
      <TestimonialsSection />
      <PricingSection />
      <ComparisonSection />
      <SecuritySection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. HERO
// ---------------------------------------------------------------------------

function HeroSection() {
  const { signIn } = useAuthActions();
  const [selectedModel, setSelectedModel] = useState("claude-haiku");
  const [keyMode, setKeyMode] = useState<"hosted" | "byok">("hosted");

  // Non-BYOK-only models for "We provide" mode; all models for BYOK
  const visibleModels = keyMode === "byok"
    ? MODELS.filter((m) => !("platformOnly" in m && m.platformOnly))
    : MODELS.filter((m) => !("byokOnly" in m && m.byokOnly));

  // Reset selection if current model isn't visible in the new key mode
  const effectiveModel = visibleModels.some((m) => m.id === selectedModel)
    ? selectedModel
    : "claude-haiku";

  return (
    <section className="relative pt-20 pb-24 lg:pt-28 lg:pb-32 px-6 lg:px-12 overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r from-primary/0 via-primary to-primary/0" />

      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage: "radial-gradient(ellipse 85% 70% at 55% 35%, black 0%, rgba(0,0,0,0.3) 55%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 70% at 55% 35%, black 0%, rgba(0,0,0,0.3) 55%, transparent 100%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid xl:grid-cols-[5fr_7fr] gap-12 xl:gap-16 items-start">
          {/* Left: Marketing copy */}
          <motion.div
            className="flex flex-col items-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          >
            <img src="/icon-white.svg" alt="LifeOS" className="size-12 mb-5" />

            <div className="flex items-center gap-4 mb-1">
              <a href="https://lifeos.zone" target="_blank" rel="noopener noreferrer" className="text-2xl font-medium tracking-[-0.02em] font-heading hover:opacity-80 transition-opacity">
                <span className="text-text">Life</span>
                <span className="text-accent">OS</span>
              </a>
            </div>

            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-[2.75rem] font-medium tracking-[-0.02em] leading-[1.1] font-heading">
              Your personal life operating system,
              <br />
              <span className="text-text-muted">with an optional 24/7 AI agent.</span>
            </h1>

            <p className="mt-6 text-base text-text-muted leading-relaxed max-w-md">
              Tasks, goals, journals, day plans, weekly reviews -- all in one real-time dashboard.
              Add an AI agent that connects to Telegram, Discord, or WhatsApp and works while you sleep.
              7 persona presets, 6 themes, zero config.
            </p>

            {/* Social proof avatar stack */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {SOCIAL_PROOF_AVATARS.map((a) => (
                  <div
                    key={a.initials}
                    className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background"
                    style={{ backgroundColor: a.color }}
                  >
                    {a.initials}
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-muted font-medium">Trusted by productive people</span>
                <span className="text-[10px] text-text-muted/70">Real-time sync, hosted on secure infrastructure</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Configure your instance card */}
          <motion.div
            className="relative overflow-hidden rounded-lg"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT_EXPO }}
          >
            {/* Spinning conic-gradient border */}
            <div className="absolute -inset-px rounded-lg overflow-hidden pointer-events-none">
              <motion.div
                className="absolute"
                style={{
                  inset: "-40%",
                  background:
                    "conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.06) 70%, #7A9AF0 85%, #9DB8F8 93%, rgba(255,255,255,0.06) 100%)",
                }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, ease: "linear", duration: 6 }}
              />
            </div>

            {/* Card content */}
            <div className="relative z-10 bg-surface rounded-lg p-6">
              {/* Card header */}
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-text/8">
                <img src="/icon-white.svg" alt="LifeOS" className="size-5" />
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium text-text">Get started with LifeOS</span>
                  <span className="text-[10px] text-text-muted font-heading">Dashboard + optional AI agent</span>
                </div>
                <a
                  href="https://lifeos.zone"
                  className="text-xs text-text-muted hover:text-text transition-colors font-heading"
                >
                  or log in &rarr;
                </a>
              </div>

              {/* Model selector */}
              <div className="mb-6">
                <label className="block text-xs text-text-muted font-heading mb-3">Model</label>
                <div className="grid grid-cols-3 gap-2">
                  {visibleModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModel(model.id)}
                      className={`px-3 py-2.5 rounded-md text-[11px] font-heading leading-tight transition-all duration-150 border text-left flex items-center gap-1.5 ${
                        effectiveModel === model.id
                          ? "border-accent bg-accent/10 text-text"
                          : "border-text/10 bg-transparent text-text-muted hover:border-text/20 hover:text-text/80"
                      }`}
                    >
                      <img
                        src={model.icon}
                        alt=""
                        className={`size-3.5 shrink-0 ${"iconClass" in model && model.iconClass ? model.iconClass : ""}`}
                      />
                      <span className="truncate">{model.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* API key mode */}
              <div className="mb-6">
                <label className="block text-xs text-text-muted font-heading mb-3">API key</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKeyMode("hosted")}
                    className={`px-3 py-2.5 rounded-md text-[11px] font-heading leading-tight transition-all duration-150 border ${
                      keyMode === "hosted"
                        ? "border-accent bg-accent/10 text-text"
                        : "border-text/10 bg-transparent text-text-muted hover:border-text/20 hover:text-text/80"
                    }`}
                  >
                    We provide
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyMode("byok")}
                    className={`px-3 py-2.5 rounded-md text-[11px] font-heading leading-tight transition-all duration-150 border ${
                      keyMode === "byok"
                        ? "border-accent bg-accent/10 text-text"
                        : "border-text/10 bg-transparent text-text-muted hover:border-text/20 hover:text-text/80"
                    }`}
                  >
                    Bring your own
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-text-muted font-heading leading-relaxed">
                  {keyMode === "hosted"
                    ? "No API key needed. We handle provisioning and rate limits."
                    : "Connect your own OpenAI, Anthropic, or Google AI key."}
                </p>
              </div>

              {/* Deploy button */}
              <button
                type="button"
                onClick={() => {
                  // Store preferences in sessionStorage (read after OAuth redirect)
                  sessionStorage.setItem("pref_plan", keyMode === "hosted" ? "ours" : "byok");
                  sessionStorage.setItem("pref_model", effectiveModel);
                  capture(EVENTS.SIGNED_IN, { method: "google", model: effectiveModel, plan: keyMode });
                  void signIn("google");
                }}
                className="w-full flex items-center justify-center gap-2.5 bg-accent hover:bg-accent/90 text-bg font-medium rounded-md py-3 text-sm transition-colors duration-150 cursor-pointer"
              >
                <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google to deploy
              </button>

              <p className="mt-3 text-center text-[10px] text-text-muted/50 font-heading">
                7-day free trial on BYOK plan
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. VIDEO
// ---------------------------------------------------------------------------

function VideoSection() {
  return (
    <section className="pb-24 lg:pb-32 px-6 lg:px-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        className="max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden border border-text/10"
      >
        <iframe
          src="https://www.youtube.com/embed/hgwFs6z0iS8?rel=0&modestbranding=1&color=white"
          title="LifeOS demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. TESTIMONIALS MARQUEE
// ---------------------------------------------------------------------------

function TestimonialsSection() {
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="pb-24 lg:pb-32 overflow-hidden">
      <div className="relative">
        {/* Fading edges */}
        <div className="absolute inset-y-0 left-0 w-24 md:w-40 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 md:w-40 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee flex gap-6 w-max hover:[animation-play-state:paused]">
          {doubled.map((t, i) => (
            <div
              key={`${t.name}-${i}`}
              className="w-[340px] shrink-0 rounded-lg bg-surface border border-text/[0.08] p-6"
            >
              <p className="text-[13px] text-text-muted leading-relaxed font-heading mb-4">
                &ldquo;{t.quote}
                <span className="bg-text/[0.06] text-text rounded px-1 py-0.5">
                  {t.highlight}
                </span>
                {t.quoteTail}&rdquo;
              </p>
              <div className="flex items-center gap-2.5">
                <div
                  className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-2 ring-background"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name[0]}
                </div>
                <div className="flex items-center">
                  <span className="text-xs font-medium text-text/90">{t.name}</span>
                  <span className="text-[11px] text-text-muted ml-2">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. PRICING
// ---------------------------------------------------------------------------

function PricingSection() {
  return (
    <section className="py-24 lg:py-32 px-6 lg:px-12 border-t border-text/[0.08]" id="pricing">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          badge="Pricing"
          title="Simple, transparent pricing."
          titleMuted="Cancel anytime."
          subtitle="All plans include managed hosting, automatic updates, and full isolation. Credits roll over month-to-month."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} />
          ))}
        </div>

        <p className="text-center text-xs text-text-muted/50 font-heading mt-8">
          All prices in EUR. Cancel anytime. Credits roll over month-to-month.
        </p>
      </div>
    </section>
  );
}

function PricingCard({ tier }: { tier: (typeof PRICING_TIERS)[number] }) {
  const { signIn } = useAuthActions();

  const card = (
    <div
      className={`relative z-10 bg-surface rounded-lg border ${
        tier.popular ? "border-transparent" : "border-text/[0.08]"
      } p-5 h-full flex flex-col`}
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-heading font-medium text-text/90">{tier.name}</h3>
        {tier.badge && tier.id === "byok" && (
          <span className="text-[10px] font-heading text-accent px-1.5 py-0.5 rounded border border-accent/20 bg-accent/5 uppercase tracking-wide">
            {tier.badge}
          </span>
        )}
        {tier.badge && tier.popular && (
          <span className="text-[10px] font-heading text-text-muted px-1.5 py-0.5 rounded border border-text-muted/30 uppercase tracking-wide">
            {tier.badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-3xl font-medium tracking-[-0.02em] text-text">
          EUR {tier.price}
        </span>
        <span className="text-sm text-text-muted font-heading">EUR/mo</span>
      </div>

      <p className="text-[12px] text-text-muted font-heading leading-relaxed flex-1 mb-5">
        {tier.description}
      </p>

      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem("pref_plan", tier.id);
          capture(EVENTS.SIGNED_IN, { method: "google", plan: tier.id });
          void signIn("google");
        }}
        className={`w-full flex items-center justify-center py-2.5 rounded-md transition-all duration-150 active:scale-[0.99] cursor-pointer ${
          tier.popular
            ? "bg-accent hover:bg-accent/90 text-bg text-sm font-medium"
            : "border border-text/10 text-sm font-heading text-text-muted hover:border-text/20 hover:text-text"
        }`}
      >
        {tier.cta}
      </button>
    </div>
  );

  if (tier.popular) {
    return (
      <div className="relative rounded-lg overflow-hidden">
        {/* Spinning conic-gradient border */}
        <div className="absolute -inset-px rounded-lg overflow-hidden pointer-events-none">
          <motion.div
            className="absolute"
            style={{
              inset: "-40%",
              background:
                "conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.06) 70%, #7A9AF0 85%, #9DB8F8 93%, rgba(255,255,255,0.06) 100%)",
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 6 }}
          />
        </div>
        {card}
      </div>
    );
  }

  return card;
}

// ---------------------------------------------------------------------------
// 5. COMPARISON TABLE
// ---------------------------------------------------------------------------

function ComparisonSection() {
  const [selectedOptional, setSelectedOptional] = useState<string[]>(["myclaw", "simpleclaw"]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const addProvider = (id: string) => {
    setSelectedOptional((prev) => [...prev, id]);
    setDropdownOpen(false);
  };

  const removeProvider = (id: string) => {
    setSelectedOptional((prev) => prev.filter((p) => p !== id));
  };

  const hiddenProviders = OPTIONAL_PROVIDERS.filter(
    (p) => !selectedOptional.includes(p.id),
  );

  // Build column list: fixed + selected optional
  const allColumns = [
    ...FIXED_PROVIDERS,
    ...OPTIONAL_PROVIDERS.filter((p) => selectedOptional.includes(p.id)),
  ];

  return (
    <section className="py-24 lg:py-32 px-6 lg:px-12 border-t border-text/[0.08] bg-surface/30">
      <div className="max-w-4xl mx-auto">
        <SectionHeading
          badge="Compare"
          title="Not all hosting is equal."
          titleMuted="See what you actually get."
          blogLink={{ text: "Deep dive \u2192", href: "https://lifeos.zone/blog/lifeos-vs-shared-ai-platforms" }}
        />

        {/* Compare with... button */}
        {hiddenProviders.length > 0 && (
          <div className="flex justify-end mb-3">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-text/10 text-xs font-heading text-text-muted hover:border-text/15 hover:text-text/80 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Compare with...
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-text/10 rounded-lg z-50 py-1 shadow-lg">
                    {hiddenProviders.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addProvider(p.id)}
                        className="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer font-heading"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl bg-surface border border-text/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-text/[0.06]">
                  <th className="text-[11px] font-medium text-text-muted font-heading px-4 py-3 whitespace-nowrap">
                    Feature
                  </th>
                  {allColumns.map((col) => {
                    const isAzin = col.highlight;
                    const isOptional = OPTIONAL_PROVIDERS.some((p) => p.id === col.id);
                    return (
                      <th
                        key={col.id}
                        className={`text-[11px] font-medium font-heading px-4 py-3 text-center whitespace-nowrap ${
                          isAzin ? "text-accent bg-accent/[0.02]" : "text-text-muted"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            {col.name}
                            {isOptional && (
                              <button
                                onClick={() => removeProvider(col.id)}
                                className="text-text-muted/40 hover:text-text transition-colors cursor-pointer"
                                aria-label={`Remove ${col.name}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {isAzin && (
                            <span className="text-[10px] font-heading text-accent tracking-wide">
                              Recommended
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.id}
                    className={i < COMPARISON_ROWS.length - 1 ? "border-b border-text/[0.04]" : ""}
                  >
                    <td className="text-[12px] text-text/80 font-heading font-medium px-4 py-2.5 whitespace-nowrap">
                      {row.label}
                    </td>
                    {allColumns.map((col) => {
                      const isAzin = col.highlight;
                      const value = col.values[row.id] ?? "?";
                      return (
                        <td
                          key={col.id}
                          className={`px-4 py-2.5 text-center ${
                            isAzin ? "bg-accent/[0.02]" : ""
                          }`}
                        >
                          <CellValue value={value} highlighted={isAzin} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. SECURITY
// ---------------------------------------------------------------------------

function SecuritySection() {
  const [expandedPillar, setExpandedPillar] = useState<number | null>(null);

  return (
    <section className="py-24 lg:py-32 px-6 lg:px-12 border-t border-text/[0.08]">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          badge="Security architecture"
          title="Security by design."
        />

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          className="max-w-lg mx-auto mb-14 text-center"
        >
          <p className="text-base text-text-muted leading-relaxed max-w-lg mx-auto mb-3">
            AI agents will eventually be compromised. When that happens, the blast radius
            should be exactly one user.
          </p>
          <p className="text-sm text-text-muted/70 leading-relaxed max-w-lg mx-auto">
            Every instance runs in a private, single-tenant pod -- isolated, encrypted, and
            accessible only by its owner. No shared containers. No shared memory. No shared risk.
          </p>
          <a
            href="https://lifeos.zone/blog/sandbox-your-ai-agents"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-accent hover:text-accent/80 transition-colors mt-3"
          >
            Why sandboxing matters &rarr;
          </a>
        </motion.div>

        {/* Architecture flow */}
        <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-2 items-stretch mb-16">
          <ArchCard
            icon={MessageCircle}
            title="Your device"
            description="Messages only -- no keys, no tokens, no secrets touch your device."
            badge="Zero secrets on device"
            badgeColor="text-success"
            badgeIcon={EyeOff}
          />
          <div className="hidden md:flex items-center justify-center text-text-muted/30">
            <ChevronRight className="size-6" />
          </div>
          <ArchCard
            icon={Shield}
            title="AI Gateway"
            description="Google OAuth verification. Confirms identity and ownership before any request reaches your pod."
            badge="TLS + owner verification"
            badgeColor="text-accent"
            badgeIcon={Lock}
          />
          <div className="hidden md:flex items-center justify-center text-text-muted/30">
            <ChevronRight className="size-6" />
          </div>
          <ArchCard
            icon={Server}
            title="Your isolated pod"
            description="Dedicated StatefulSet. 5GB encrypted volume. Own TLS certificate. Network-isolated from every other pod."
            badge="CMEK + auto-rotate"
            badgeColor="text-accent"
            badgeIcon={KeyRound}
            highlighted
          />
        </div>

        {/* Under the hood divider */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-heading text-text-muted whitespace-nowrap">Under the hood</span>
          <div className="h-px bg-text/[0.08] flex-1" />
        </div>

        {/* Security pillars */}
        <div className="grid md:grid-cols-2 gap-3">
          {SECURITY_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            const isOpen = expandedPillar === i;
            return (
              <div key={pillar.title} className={i === SECURITY_PILLARS.length - 1 && SECURITY_PILLARS.length % 2 !== 0 ? "md:col-span-2" : ""}>
              <button
                onClick={() => setExpandedPillar(isOpen ? null : i)}
                className="text-left bg-surface rounded-lg border border-text/[0.08] hover:border-text/15 p-4 transition-colors cursor-pointer w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-text/[0.04] border border-text/[0.08] flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                  <span className="text-[13px] font-heading font-medium text-text/90 flex-1">
                    {pillar.title}
                  </span>
                  <ChevronDown
                    className={`size-4 text-text-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <p className="text-[11px] text-text-muted font-heading leading-relaxed mt-2.5 pl-10">
                  {pillar.summary}
                </p>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-text/[0.06] mt-3 pt-3 ml-10">
                        <p className="text-[11px] text-text-muted font-heading leading-relaxed">
                          {pillar.detail}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
              </div>
            );
          })}
        </div>

        {/* GitHub callout */}
        <div className="mt-10 text-center">
          <a
            href="https://github.com/lifeos-zone/lifeos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text transition-colors"
          >
            <GitHubIcon className="size-4" />
            Don&apos;t trust us -- audit the code yourself
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </section>
  );
}

function ArchCard({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor,
  badgeIcon: BadgeIcon,
  highlighted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  badgeIcon: React.ComponentType<{ className?: string }>;
  highlighted?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      className={`rounded-lg border p-5 flex flex-col ${
        highlighted
          ? "bg-surface border-accent/20"
          : "bg-surface border-text/[0.08]"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center mb-3 border ${
          highlighted
            ? "bg-accent/10 border-accent/20"
            : "bg-text/[0.04] border-text/[0.08]"
        }`}
      >
        <Icon className={`w-4 h-4 ${highlighted ? "text-accent" : "text-text-muted"}`} />
      </div>
      <h4 className="text-xs font-medium text-text mb-2 font-heading">{title}</h4>
      <p className="text-[11px] text-text-muted leading-relaxed flex-1 mb-3 font-heading">
        {description}
      </p>
      <span className={`inline-flex self-start items-center gap-1.5 text-[10px] font-medium ${badgeColor}`}>
        <BadgeIcon className="w-3 h-3" />
        {badge}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// 7. FAQ
// ---------------------------------------------------------------------------

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 lg:py-32 px-6 lg:px-12">
      <div className="max-w-2xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.02em] leading-[1.1] font-heading">
            Common questions
          </h2>
        </motion.div>

        <div>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question} className="border-b border-text/[0.08]">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
                >
                  <span className="text-sm font-medium text-text/90 group-hover:text-text transition-colors pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                      className="overflow-hidden"
                    >
                      <div className="pb-5">
                        <p className="text-sm text-text-muted leading-relaxed">
                          {item.answer}
                        </p>
                        {item.link && (
                          <a
                            href={item.link.href}
                            target={item.link.href.startsWith("#") ? undefined : "_blank"}
                            rel={item.link.href.startsWith("#") ? undefined : "noopener noreferrer"}
                            className="inline-block text-xs text-accent hover:text-accent/80 transition-colors mt-2"
                          >
                            {item.link.text} &rarr;
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 8. FINAL CTA
// ---------------------------------------------------------------------------

function CTASection() {
  return (
    <section className="py-24 lg:py-28 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16"
        >
          {/* Left side */}
          <div>
            <h2 className="text-4xl lg:text-5xl font-medium tracking-[-0.02em] leading-[1.1] font-heading">
              Ready to deploy?
              <br />
              <span className="text-text-muted">1 minute, one Google sign-in.</span>
            </h2>
            <p className="mt-5 text-sm lg:text-base text-text-muted leading-relaxed max-w-lg">
              LifeOS gives you a real-time productivity dashboard, encrypted storage, and an optional AI agent.
              Sign in with Google and start organizing your life -- we handle the rest.
            </p>
          </div>

          {/* Right side */}
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-bg text-sm font-medium px-8 py-4 rounded-md transition-all duration-150 active:scale-[0.99]"
            >
              Get Started with LifeOS
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="mailto:support@lifeos.zone?subject=LifeOS"
              className="inline-flex items-center justify-center ring-1 ring-text/10 text-sm px-8 py-4 rounded-md text-text hover:ring-text/20 transition-all duration-150 active:scale-[0.99]"
            >
              Contact us
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-text/[0.08] py-8 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/icon-white.svg" alt="LifeOS" className="size-5" />
          <span className="text-xs text-text-muted font-heading">
            Life<span className="text-text">OS</span>
          </span>
        </div>
        <div className="flex items-center gap-6 text-[11px] text-text-muted font-heading">
          <a href="https://github.com/lifeos-zone/lifeos" target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">
            GitHub
          </a>
          <a href="https://lifeos.zone/blog" target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">
            Blog
          </a>
          <a href="mailto:support@lifeos.zone" className="hover:text-text transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
