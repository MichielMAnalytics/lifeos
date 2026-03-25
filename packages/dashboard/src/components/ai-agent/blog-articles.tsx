'use client';

import { capture, EVENTS } from "@/lib/analytics";

const ARTICLES = [
  {
    number: 1,
    title: "Your First 30 Minutes: Set Up Your AI Agent Right",
    url: "https://lifeos.zone/blog/first-30-minutes-ai-agent",
    summary:
      "You just deployed your AI agent. Gateway is running. Now what?",
  },
  {
    number: 2,
    title: "Memory That Actually Works: Setup Guide (Not Just Chat History)",
    url: "https://lifeos.zone/blog/ai-agent-memory-setup-guide",
    summary:
      "Your AI agent doesn't magically remember things. You have to teach it how.",
  },
  {
    number: 3,
    title: "Skills & Permissions: What Your Agent Can Do (And What It Shouldn't)",
    url: "https://lifeos.zone/blog/ai-agent-skills-permissions",
    summary:
      "Without boundaries, your agent can do everything. With boundaries, only what it needs.",
  },
  {
    number: 4,
    title: "Multi-Agent Teams: Running Multiple Agents (The Right Way)",
    url: "https://lifeos.zone/blog/multi-agent-teams",
    summary:
      "One agent is useful. Five agents working together? That's a team.",
  },
];

export function BlogArticles() {
  return (
    <section className="max-w-4xl mx-auto mt-16">
      <div className="mb-6">
        <h2 className="text-lg font-heading font-medium text-zinc-100 tracking-tight">
          Learn AI Agent
        </h2>
        <p className="text-sm text-zinc-400">
          From first agent to production team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ARTICLES.map((article) => (
          <a
            key={article.number}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              capture(EVENTS.BLOG_ARTICLE_CLICKED, {
                article: article.number,
                title: article.title,
              })
            }
            className="bg-[#171412] border border-white/[0.06] rounded-xl p-5 flex flex-col transition-all duration-300 hover:border-white/[0.14]"
          >
<span className="font-heading font-medium tracking-[-0.02em] text-zinc-100 text-sm leading-snug">
              {article.title}
            </span>
            <span className="text-sm leading-relaxed text-zinc-400 mt-3">
              {article.summary}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
