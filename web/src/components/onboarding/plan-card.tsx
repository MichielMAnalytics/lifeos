'use client';

export function PlanCard({
  name,
  price,
  features,
  popular,
  loading,
  billedAnnually,
  onClick,
}: {
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
  loading?: boolean;
  billedAnnually?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`group relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
        popular
          ? 'border-accent/40 bg-accent/[0.04]'
          : 'border-border/60 bg-surface/30 hover:border-text-muted/20'
      } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {popular && (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[10px] font-medium text-bg tracking-wide">
          Recommended
        </span>
      )}
      <span className="text-sm font-medium text-text-muted">{name}</span>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-3xl font-semibold tracking-tight text-text">
          {'\u20AC'}0/mo
        </span>
        <span className="text-sm text-text-muted/40 line-through">
          {price}
        </span>
      </div>
      {billedAnnually && (
        <p className="text-[10px] text-text-muted/50 mt-0.5">billed annually</p>
      )}
      <div className="mt-4 space-y-2">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-text-muted leading-relaxed">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success/70">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {f}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-center rounded-lg bg-accent/10 py-2 text-xs font-medium text-accent transition-colors group-hover:bg-accent group-hover:text-bg">
        {loading ? (
          <span className="flex items-center gap-1">
            Redirecting
            <span className="inline-flex">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </span>
        ) : (
          'Start free trial'
        )}
      </div>
    </button>
  );
}
