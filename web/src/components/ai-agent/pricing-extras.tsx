'use client';

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Shield, Zap, RefreshCw, Key, Server, Lock } from "lucide-react";


// ── Demo Video ───────────────────────────────────────────────────────

function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section className="max-w-3xl mx-auto mt-20">
      <div className="text-center mb-8">
        <h2 className="text-lg font-medium text-text mb-2 font-heading">
          This is what you get
        </h2>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          The complete AI agent setup — deployed, configured, and running in under a minute.
        </p>
      </div>
      <div
        className="relative cursor-pointer group rounded-lg overflow-hidden border border-text/6"
        onClick={handlePlay}
      >
        <video
          ref={videoRef}
          src="/short-demo.mov"
          className="w-full"
          playsInline
          preload="metadata"
          onEnded={() => setIsPlaying(false)}
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity group-hover:bg-black/20">
            <div className="size-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <svg className="size-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


// ── Social Proof ─────────────────────────────────────────────────────

const testimonials = [
  {
    quote: "Had my own AI assistant running on Telegram in under a minute. No server setup, no Docker, nothing.",
    highlight: "under a minute",
    name: "James",
    role: "Indie Developer",
    avatar: "/user-1-james.webp",
  },
  {
    quote: "I tried self-hosting an AI agent for a week. LifeOS replaced all of that with one click.",
    highlight: "one click",
    name: "Edwin",
    role: "Software Engineer",
    avatar: "/user-2-edwin.webp",
  },
  {
    quote: "The BYOK plan is genius — I use my own API keys with zero markup. Best deal I've found.",
    highlight: "zero markup",
    name: "Carla",
    role: "AI Researcher",
    avatar: "/user-3-carla.webp",
  },
  {
    quote: "Switched from a shared hosting setup. Having my own isolated pod with encrypted secrets is a different league.",
    highlight: "isolated pod",
    name: "Alvin",
    role: "CTO, Early-Stage Startup",
    avatar: "/user-4-alvin.webp",
  },
];

function SocialProof() {
  return (
    <section className="max-w-4xl mx-auto mt-20">
      <div className="text-center mb-10">
        <h2 className="text-lg font-medium text-text mb-2 font-heading">
          Trusted by developers and teams
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-text/6">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-surface p-6 flex flex-col justify-between">
            <p className="text-[11px] text-text-muted leading-relaxed mb-5">
              &ldquo;{t.quote.split(t.highlight)[0]}
              <span className="text-text font-medium">{t.highlight}</span>
              {t.quote.split(t.highlight)[1]}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <img
                src={t.avatar}
                alt={t.name}
                className="size-8 rounded-full object-cover"
              />
              <div>
                <p className="text-xs font-medium text-text">{t.name}</p>
                <p className="text-[10px] text-text-muted">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Included Features ────────────────────────────────────────────────

const features = [
  { icon: Server, title: "Dedicated pod", desc: "Your own isolated Kubernetes pod — not shared with anyone." },
  { icon: Lock, title: "Encrypted secrets", desc: "API keys stored in Google Cloud Secret Manager with KMS encryption." },
  { icon: RefreshCw, title: "Auto updates", desc: "Every agent release deployed automatically with zero downtime." },
  { icon: Shield, title: "Network isolation", desc: "Pod-level network policies block all cross-tenant communication." },
  { icon: Key, title: "BYOK or managed", desc: "Bring your own API keys or use ours — switch anytime." },
  { icon: Zap, title: "60s deploys", desc: "From sign-up to a running instance in under one minute." },
];

function IncludedFeatures() {
  return (
    <section className="max-w-4xl mx-auto mt-20">
      <div className="text-center mb-10">
        <h2 className="text-lg font-medium text-text mb-2 font-heading">
          Included in every plan
        </h2>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          Production-grade infrastructure so you can focus on using the agent.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-text/6">
        {features.map((f) => (
          <div key={f.title} className="bg-surface p-5">
            <f.icon className="size-4 text-text-muted mb-3" strokeWidth={1.5} />
            <h3 className="text-xs font-medium text-text mb-1">{f.title}</h3>
            <p className="text-[11px] text-text-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────────────

const steps = [
  { num: "1", title: "Choose a plan", desc: "Pick BYOK (free 7-day trial) or a managed plan with included credits." },
  { num: "2", title: "Configure your agent", desc: "Select your AI model and messaging channel. Connect your API keys if using BYOK." },
  { num: "3", title: "Deploy in one click", desc: "Your dedicated instance is live in under 60 seconds. Start chatting immediately." },
];

function HowItWorks() {
  return (
    <section className="max-w-4xl mx-auto mt-20">
      <div className="text-center mb-10">
        <h2 className="text-lg font-medium text-text mb-2 font-heading">
          How it works
        </h2>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          Three steps. No terminal. No config files.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-text/6">
        {steps.map((s) => (
          <div key={s.num} className="bg-surface p-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted/80 mb-3 block">
              Step {s.num}
            </span>
            <h3 className="text-xs font-medium text-text mb-2">{s.title}</h3>
            <p className="text-[11px] text-text-muted leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────

const faqs = [
  {
    q: "Why pay for the AI agent add-on?",
    a: "Running an AI agent properly requires infrastructure: Kubernetes, TLS, secrets management, vulnerability patching, and regular updates. LifeOS gives you all of that — pod isolation, encrypted storage, secret management, automatic updates — in 60 seconds. You pay for the infrastructure and ops so you can focus on using the agent, not babysitting it.",
  },
  {
    q: "What happens to my unused credits?",
    a: "They roll over. Every month, your unused model credits carry forward — no expiry, no \"use it or lose it.\" If you have a quiet month, your credits stack for when you need them.",
  },
  {
    q: "Can I switch plans or cancel at any time?",
    a: "Yes. Upgrade, downgrade, or cancel whenever you want — no lock-in, no penalties. Your rolled-over credits stay available until the end of your current billing period. If you're on the BYOK plan, the 7-day trial is completely free with no card required.",
  },
  {
    q: "How is my data kept private?",
    a: "Your instance runs in its own dedicated Kubernetes pod — not a shared container, not a multi-tenant process. Your API keys are stored in Google Cloud Secret Manager and never touch the runtime. Network policies block all communication between pods. Access is bound to your Google account at the infrastructure level. There are no admin backdoors.",
  },
  {
    q: "What do I get that I can't get self-hosting?",
    a: "Automatic security patching, zero-downtime updates on every release, enterprise secret management via Google Cloud KMS with 90-day key rotation, per-pod network isolation, built-in rate limiting, a full web UI — all without writing a single line of config. Self-hosting gives you the agent. LifeOS gives you the agent plus production-grade infrastructure around it.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="max-w-2xl mx-auto mt-20">
      <div className="text-center mb-10">
        <h2 className="text-lg font-medium text-text mb-2 font-heading">
          Frequently asked questions
        </h2>
      </div>
      <div className="divide-y divide-text/6">
        {faqs.map((faq, i) => (
          <button
            key={i}
            className="w-full text-left py-4 group"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xs font-medium text-text group-hover:text-text/80 transition-colors">
                {faq.q}
              </h3>
              <span
                className={cn(
                  "text-text-muted/70 text-sm shrink-0 transition-transform duration-200",
                  open === i && "rotate-45",
                )}
              >
                +
              </span>
            </div>
            <div
              className={cn(
                "grid transition-all duration-200 ease-out",
                open === i ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="text-[11px] text-text-muted leading-relaxed pr-8">
                  {faq.a}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Combined Export ───────────────────────────────────────────────────

export function PricingExtras() {
  return (
    <>
      <DemoVideo />
      <SocialProof />
      <IncludedFeatures />
      <HowItWorks />
      <FAQ />
    </>
  );
}
