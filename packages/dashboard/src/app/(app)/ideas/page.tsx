import type { Idea } from '@lifeos/shared';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { IdeaForm } from '@/components/idea-form';

const actionabilityLabel = (level: string | null) => {
  switch (level) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return 'Unset';
  }
};

export default async function IdeasPage() {
  const { data: ideas } = await api.get<{ data: Idea[] }>('/api/v1/ideas');

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-text">
        Ideas <span className="text-text-muted font-normal">[ {ideas.length} ]</span>
      </h1>

      {/* Quick Add */}
      <div className="border border-border p-6">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Quick Add</p>
        <IdeaForm />
      </div>

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No ideas yet</p>
          <p className="text-sm text-text-muted mt-1">Capture one above to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea, idx) => (
            <div key={idea.id} className="border border-border p-6 space-y-4 hover:border-text/30 transition-colors group">
              {/* Index */}
              <span className="text-xs font-mono text-text-muted">
                [{String(idx + 1).padStart(2, '0')}]
              </span>

              {/* Content */}
              <p className="text-sm text-text leading-relaxed">{idea.content}</p>

              {/* Next step */}
              {idea.next_step && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-text-muted">
                    <span className="font-bold text-text uppercase tracking-wide">Next:</span>{' '}
                    {idea.next_step}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 text-xs text-text-muted">
                <span className="font-mono">
                  {formatDate(idea.created_at.split('T')[0])}
                </span>
                <span>[ {actionabilityLabel(idea.actionability)} ]</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
