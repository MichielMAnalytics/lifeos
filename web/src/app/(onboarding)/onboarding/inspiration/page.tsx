'use client';

/**
 * TOP 3 — Final pricing confirm options for Michael
 * Browse at /onboarding/inspiration?dev
 */

function Option({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-border/40 bg-surface/10 p-5 w-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">{label}</span>
        <h3 className="text-sm font-semibold text-text">{name}</h3>
      </div>
      <div className="rounded-xl border border-border/30 bg-bg p-6">
        {children}
      </div>
    </div>
  );
}

function Cta() {
  return <button className="mt-5 w-full rounded-lg bg-accent py-3 text-sm font-medium text-bg">Start free trial</button>;
}

export default function InspirationPage() {
  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-text mb-1">Final 3 — Pick one</h1>
        <p className="text-sm text-text-muted mb-8">&euro;20 platform + &euro;10 AI credits = &euro;30/mo. 7-day free trial. Unused credits roll over.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* A — Clean Receipt */}
          <Option label="A" name="Clean Receipt">
            <p className="text-center text-lg font-semibold text-text">7 days free</p>
            <p className="text-center text-xs text-text-muted mt-1">Full access, no charge today</p>

            <div className="mt-5 rounded-lg bg-text/[0.03] p-4 space-y-2 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>LifeOS + LifeCoach</span>
                <span className="text-text font-medium">&euro;20</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <div className="flex items-center gap-1.5">
                  <span>AI credits</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">direct to Claude</span>
                </div>
                <span className="text-text font-medium">&euro;10</span>
              </div>
              <div className="border-t border-border/30 pt-2 flex justify-between font-semibold text-text">
                <span>After trial</span>
                <span>&euro;30/mo</span>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-text-muted/50 text-center">Unused credits roll over to next month.</p>
            <Cta />
            <p className="mt-2 text-[10px] text-text-muted/50 text-center">Cancel anytime.</p>
          </Option>

          {/* B — Receipt with descriptions */}
          <Option label="B" name="Receipt + Detail">
            <p className="text-center text-lg font-semibold text-text">7 days free</p>
            <p className="text-center text-xs text-text-muted mt-1">Full access, no charge today</p>

            <div className="mt-5 rounded-lg bg-text/[0.03] p-4 space-y-3 text-sm">
              <div className="flex justify-between items-start text-text-muted gap-4">
                <div className="min-w-0">
                  <span className="text-text font-medium text-xs block">LifeOS + LifeCoach</span>
                  <span className="text-[10px] text-text-muted/50">Goals, tasks, journals, coaching, channels</span>
                </div>
                <span className="text-text font-medium shrink-0">&euro;20</span>
              </div>
              <div className="flex justify-between items-start text-text-muted gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text font-medium text-xs">AI credits</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">direct to Claude</span>
                  </div>
                  <span className="text-[10px] text-text-muted/50">Unused credits roll over monthly</span>
                </div>
                <span className="text-text font-medium shrink-0">&euro;10</span>
              </div>
              <div className="border-t border-border/30 pt-2 flex justify-between font-semibold text-text">
                <span>After trial</span>
                <span>&euro;30/mo</span>
              </div>
            </div>

            <Cta />
            <p className="mt-2 text-[10px] text-text-muted/50 text-center">Cancel anytime.</p>
          </Option>

          {/* C — Ultra Compact */}
          <Option label="C" name="Ultra Compact">
            <div className="text-center">
              <p className="text-lg font-semibold text-text">7 days free</p>
              <p className="text-sm text-text-muted mt-1">then &euro;30/mo</p>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-lg bg-text/[0.03] p-3">
              <div className="flex-1 text-center border-r border-border/30 pr-3">
                <p className="text-lg font-bold text-text">&euro;20</p>
                <p className="text-[10px] text-text-muted">platform</p>
              </div>
              <div className="text-text-muted/30 text-lg">+</div>
              <div className="flex-1 text-center pl-3">
                <p className="text-lg font-bold text-green-500">&euro;10</p>
                <p className="text-[10px] text-text-muted">AI credits</p>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-text-muted/50 text-center">
              AI credits go direct to Claude. Unused credits roll over.
            </p>

            <Cta />
            <p className="mt-2 text-[10px] text-text-muted/50 text-center">Cancel anytime.</p>
          </Option>

        </div>
      </div>
    </div>
  );
}
