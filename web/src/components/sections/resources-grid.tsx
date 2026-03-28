'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import type { Doc } from '@/lib/convex-api';

// ── Types ────────────────────────────────────────────

type Resource = Doc<'resources'>;
type ResourceType = 'article' | 'tool' | 'book' | 'video' | 'other';
type SortField = 'title' | 'type' | 'date';
type SortDir = 'asc' | 'desc';

const RESOURCE_TYPES: ResourceType[] = ['article', 'tool', 'book', 'video', 'other'];

const TYPE_COLORS: Record<ResourceType, string> = {
  article: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  tool: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  book: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  video: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
  other: 'text-text-muted border-border bg-surface',
};

function getTypeColor(type: string | undefined): string {
  if (type && type in TYPE_COLORS) return TYPE_COLORS[type as ResourceType];
  return TYPE_COLORS.other;
}

function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ── Filter Dropdown ──────────────────────────────────

interface FilterDropdownProps {
  typeFilter: string | null;
  tagFilter: string | null;
  allTags: string[];
  onTypeFilter: (type: string | null) => void;
  onTagFilter: (tag: string | null) => void;
  onReset: () => void;
  onClose: () => void;
}

function FilterDropdown({
  typeFilter,
  tagFilter,
  allTags,
  onTypeFilter,
  onTagFilter,
  onReset,
  onClose,
}: FilterDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full right-0 mt-1 w-56 border border-border bg-bg shadow-lg p-3 space-y-3"
    >
      {/* Type filter */}
      <div>
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
          Type
        </p>
        <div className="flex flex-wrap gap-1">
          {RESOURCE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTypeFilter(typeFilter === t ? null : t)}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                typeFilter === t
                  ? 'bg-accent/20 border-accent text-text font-medium'
                  : 'border-border text-text-muted hover:border-text-muted/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div>
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1.5">
            Tag
          </p>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagFilter(tagFilter === tag ? null : tag)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  tagFilter === tag
                    ? 'bg-accent/20 border-accent text-text font-medium'
                    : 'border-border text-text-muted hover:border-text-muted/40'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      {(typeFilter || tagFilter) && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-text-muted hover:text-text underline"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

// ── Type Selector Dropdown ───────────────────────────

interface TypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
}

function TypeSelector({ value, onChange }: TypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`text-xs px-2 py-1 rounded border transition-colors ${getTypeColor(value)}`}
      >
        {value || 'other'} <span className="ml-1 opacity-50">&#9662;</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-28 border border-border bg-bg shadow-lg p-1">
          {RESOURCE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                value === t ? 'bg-accent/10 font-medium' : 'hover:bg-surface-hover'
              } ${getTypeColor(t)}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tags Editor ──────────────────────────────────────

interface TagsEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  editable?: boolean;
}

function TagsEditor({ tags, onChange, editable = false }: TagsEditorProps) {
  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [adding]);

  const handleAdd = useCallback(() => {
    const newTags = inputValue
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && !tags.includes(t));
    if (newTags.length > 0) {
      onChange([...tags, ...newTags]);
    }
    setInputValue('');
    setAdding(false);
  }, [inputValue, tags, onChange]);

  const handleRemove = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`text-xs px-1.5 py-0.5 rounded border border-border text-text-muted ${
            editable ? 'cursor-pointer hover:border-red-400/50 hover:text-red-400 hover:line-through' : ''
          }`}
          onClick={editable ? () => handleRemove(tag) : undefined}
          title={editable ? 'Click to remove' : undefined}
        >
          {tag}
        </span>
      ))}
      {editable && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs text-text-muted hover:text-text px-1 py-0.5 border border-dashed border-border rounded hover:border-text-muted/40 transition-colors"
        >
          + tag
        </button>
      )}
      {editable && adding && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
            if (e.key === 'Escape') {
              setAdding(false);
              setInputValue('');
            }
          }}
          onBlur={handleAdd}
          placeholder="tag1, tag2"
          className="text-xs px-1.5 py-0.5 border border-border rounded bg-bg text-text w-24 focus:outline-none focus:border-accent"
        />
      )}
    </div>
  );
}

// ── Add Resource Form ────────────────────────────────

interface AddFormProps {
  onClose: () => void;
}

function AddResourceForm({ onClose }: AddFormProps) {
  const createResource = useMutation(api.resources.create);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<string>('article');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;
      setSubmitting(true);
      try {
        const tags = tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0);
        await createResource({
          title: title.trim(),
          url: url.trim() || undefined,
          type,
          tags: tags.length > 0 ? tags : undefined,
          content: content.trim() || undefined,
        });
        onClose();
      } catch (err) {
        console.error('Failed to create resource:', err);
      } finally {
        setSubmitting(false);
      }
    },
    [title, url, type, tagsInput, content, createResource, onClose],
  );

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
          Add Resource
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-text-muted hover:text-text"
        >
          Cancel
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resource title"
          className="w-full text-sm px-3 py-2 border border-border rounded bg-bg text-text focus:outline-none focus:border-accent"
          autoFocus
        />
      </div>

      {/* URL */}
      <div>
        <label className="text-xs text-text-muted block mb-1">URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full text-sm px-3 py-2 border border-border rounded bg-bg text-text focus:outline-none focus:border-accent"
        />
      </div>

      {/* Type + Tags row */}
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <label className="text-xs text-text-muted block mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="text-sm px-3 py-2 border border-border rounded bg-bg text-text focus:outline-none focus:border-accent"
          >
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-text-muted block mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="react, docs, reference"
            className="w-full text-sm px-3 py-2 border border-border rounded bg-bg text-text focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Content */}
      <div>
        <label className="text-xs text-text-muted block mb-1">Notes</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Notes about this resource..."
          rows={4}
          className="w-full text-sm px-3 py-2 border border-border rounded bg-bg text-text focus:outline-none focus:border-accent resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={!title.trim() || submitting}
        className="text-xs font-bold uppercase tracking-widest px-4 py-2 border border-border text-text hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Saving...' : 'Save Resource'}
      </button>
    </form>
  );
}

// ── Resource Detail View ─────────────────────────────

interface ResourceDetailProps {
  resource: Resource;
  onBack: () => void;
}

function ResourceDetail({ resource, onBack }: ResourceDetailProps) {
  const updateResource = useMutation(api.resources.update);
  const removeResource = useMutation(api.resources.remove);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(resource.title);
  const [editUrl, setEditUrl] = useState(resource.url ?? '');
  const [editType, setEditType] = useState(resource.type ?? 'other');
  const [editTags, setEditTags] = useState<string[]>(resource.tags ?? []);
  const [editContent, setEditContent] = useState(resource.content ?? '');
  const [saving, setSaving] = useState(false);

  // Reset edit state when resource changes
  useEffect(() => {
    setEditTitle(resource.title);
    setEditUrl(resource.url ?? '');
    setEditType(resource.type ?? 'other');
    setEditTags(resource.tags ?? []);
    setEditContent(resource.content ?? '');
  }, [resource]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateResource({
        id: resource._id,
        title: editTitle.trim(),
        url: editUrl.trim() || undefined,
        type: editType,
        tags: editTags,
        content: editContent.trim() || undefined,
      });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update resource:', err);
    } finally {
      setSaving(false);
    }
  }, [resource._id, editTitle, editUrl, editType, editTags, editContent, updateResource]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this resource?')) return;
    try {
      await removeResource({ id: resource._id });
      onBack();
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  }, [resource._id, removeResource, onBack]);

  const tags = resource.tags ?? [];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-text-muted hover:text-text uppercase tracking-widest"
      >
        &larr; Back to list
      </button>

      {/* Title */}
      {editing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="text-2xl font-bold text-text bg-bg border-b border-border w-full focus:outline-none focus:border-accent pb-1"
        />
      ) : (
        <h2 className="text-2xl font-bold tracking-tight text-text">
          {resource.title}
        </h2>
      )}

      <div className="border-t border-border" />

      {/* Metadata */}
      <div className="space-y-3">
        {/* Type */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest w-12">
            Type
          </span>
          {editing ? (
            <TypeSelector value={editType} onChange={setEditType} />
          ) : (
            <span
              className={`text-xs px-2 py-0.5 rounded border ${getTypeColor(resource.type)}`}
            >
              {resource.type ?? 'other'}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-start gap-3">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest w-12 mt-0.5">
            Tags
          </span>
          {editing ? (
            <TagsEditor tags={editTags} onChange={setEditTags} editable />
          ) : tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded border border-border text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-text-muted">--</span>
          )}
        </div>

        {/* URL */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest w-12">
            URL
          </span>
          {editing ? (
            <input
              type="text"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://..."
              className="text-sm px-2 py-1 border border-border rounded bg-bg text-text flex-1 focus:outline-none focus:border-accent"
            />
          ) : resource.url ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline truncate"
            >
              {resource.url}
            </a>
          ) : (
            <span className="text-xs text-text-muted">--</span>
          )}
        </div>
      </div>

      {/* Content / Notes */}
      <div>
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">
          Notes
        </p>
        {editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={8}
            className="w-full text-sm px-3 py-2 border border-border rounded bg-bg text-text focus:outline-none focus:border-accent resize-y"
          />
        ) : resource.content ? (
          <p className="text-sm text-text leading-relaxed whitespace-pre-line">
            {resource.content}
          </p>
        ) : (
          <p className="text-sm text-text-muted italic">No notes yet.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !editTitle.trim()}
              className="text-xs font-bold uppercase tracking-widest px-4 py-2 border border-border text-text hover:bg-surface-hover disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditTitle(resource.title);
                setEditUrl(resource.url ?? '');
                setEditType(resource.type ?? 'other');
                setEditTags(resource.tags ?? []);
                setEditContent(resource.content ?? '');
              }}
              className="text-xs text-text-muted hover:text-text uppercase tracking-widest px-4 py-2"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-bold uppercase tracking-widest px-4 py-2 border border-border text-text hover:bg-surface-hover transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs font-bold uppercase tracking-widest px-4 py-2 border border-border text-red-400 hover:bg-red-400/10 transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sort Header Button ───────────────────────────────

interface SortHeaderProps {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
}

function SortHeader({ label, field, currentSort, currentDir, onSort, className }: SortHeaderProps) {
  const isActive = currentSort === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`text-left text-xs font-bold uppercase tracking-widest transition-colors ${
        isActive ? 'text-text' : 'text-text-muted hover:text-text'
      } ${className ?? ''}`}
    >
      {label}
      {isActive && (
        <span className="ml-1 opacity-60">{currentDir === 'asc' ? '\u2191' : '\u2193'}</span>
      )}
    </button>
  );
}

// ── Main Component ───────────────────────────────────

export function ResourcesGrid() {
  const resources = useQuery(api.resources.list, {});

  const [selectedId, setSelectedId] = useState<Id<'resources'> | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Collect all unique tags
  const allTags = useMemo(() => {
    if (!resources) return [];
    const tagSet = new Set<string>();
    for (const r of resources) {
      for (const t of r.tags ?? []) {
        tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort();
  }, [resources]);

  // Handle sort toggle
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir(field === 'date' ? 'desc' : 'asc');
      }
    },
    [sortField],
  );

  // Filter + sort
  const filtered = useMemo(() => {
    if (!resources) return [];
    let list = [...resources];

    if (typeFilter) {
      list = list.filter((r) => r.type === typeFilter);
    }
    if (tagFilter) {
      list = list.filter((r) => (r.tags ?? []).includes(tagFilter));
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'type':
          cmp = (a.type ?? 'other').localeCompare(b.type ?? 'other');
          break;
        case 'date':
          cmp = a._creationTime - b._creationTime;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [resources, typeFilter, tagFilter, sortField, sortDir]);

  // Find selected resource
  const selectedResource = useMemo(() => {
    if (!selectedId || !resources) return null;
    return resources.find((r) => r._id === selectedId) ?? null;
  }, [selectedId, resources]);

  if (!resources) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  // Detail view
  if (selectedResource) {
    return (
      <div className="max-w-none">
        <ResourceDetail
          resource={selectedResource}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  const hasFilters = typeFilter !== null || tagFilter !== null;

  return (
    <div className="max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Resources{' '}
          <span className="text-text-muted font-normal">[ {resources.length} ]</span>
        </h1>

        <div className="flex items-center gap-2">
          {/* Filter button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilter((p) => !p)}
              className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                hasFilters
                  ? 'border-accent text-accent'
                  : 'border-border text-text-muted hover:text-text hover:border-text-muted/40'
              }`}
            >
              Filter{hasFilters ? ' *' : ''} &#9662;
            </button>
            {showFilter && (
              <FilterDropdown
                typeFilter={typeFilter}
                tagFilter={tagFilter}
                allTags={allTags}
                onTypeFilter={(t) => setTypeFilter(t)}
                onTagFilter={(t) => setTagFilter(t)}
                onReset={() => {
                  setTypeFilter(null);
                  setTagFilter(null);
                }}
                onClose={() => setShowFilter(false)}
              />
            )}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 border border-border text-text-muted hover:text-text hover:border-text-muted/40 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Active filters display */}
      {hasFilters && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>Filtered by:</span>
          {typeFilter && (
            <span className={`px-2 py-0.5 rounded border ${getTypeColor(typeFilter)}`}>
              {typeFilter}
            </span>
          )}
          {tagFilter && (
            <span className="px-2 py-0.5 rounded border border-border">{tagFilter}</span>
          )}
          <button
            type="button"
            onClick={() => {
              setTypeFilter(null);
              setTagFilter(null);
            }}
            className="hover:text-text underline ml-1"
          >
            clear
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAdd && <AddResourceForm onClose={() => setShowAdd(false)} />}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">
            {hasFilters ? 'No resources match filters' : 'No resources yet'}
          </p>
          <p className="text-sm text-text-muted mt-1">
            {hasFilters ? 'Try adjusting your filters.' : 'Add one above to get started.'}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-surface">
            <span className="w-6 shrink-0" />
            <SortHeader
              label="Title"
              field="title"
              currentSort={sortField}
              currentDir={sortDir}
              onSort={handleSort}
              className="flex-1 min-w-0"
            />
            <SortHeader
              label="Type"
              field="type"
              currentSort={sortField}
              currentDir={sortDir}
              onSort={handleSort}
              className="shrink-0 w-20 text-center"
            />
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest shrink-0 w-32 hidden md:block">
              Tags
            </span>
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest shrink-0 w-8 text-center hidden sm:block">
              URL
            </span>
            <SortHeader
              label="Added"
              field="date"
              currentSort={sortField}
              currentDir={sortDir}
              onSort={handleSort}
              className="shrink-0 w-16 text-right"
            />
          </div>

          {/* Rows */}
          {filtered.map((resource) => {
            const tags = resource.tags ?? [];
            return (
              <div
                key={resource._id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(resource._id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(resource._id);
                  }
                }}
                className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-surface-hover cursor-pointer group"
              >
                {/* Expand arrow */}
                <span className="text-xs text-text-muted shrink-0 w-6 group-hover:text-text transition-colors">
                  &#9656;
                </span>

                {/* Title */}
                <span className="flex-1 text-sm text-text truncate min-w-0 font-medium">
                  {resource.title}
                </span>

                {/* Type badge */}
                <span
                  className={`text-xs px-2 py-0.5 rounded border shrink-0 w-20 text-center ${getTypeColor(resource.type)}`}
                >
                  {resource.type ?? 'other'}
                </span>

                {/* Tags */}
                <div className="shrink-0 w-32 hidden md:flex flex-wrap gap-1 overflow-hidden">
                  {tags.length > 0 ? (
                    tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-1 py-0 rounded border border-border text-text-muted truncate max-w-[5rem]"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">--</span>
                  )}
                  {tags.length > 3 && (
                    <span className="text-xs text-text-muted">+{tags.length - 3}</span>
                  )}
                </div>

                {/* URL link icon */}
                <span className="shrink-0 w-8 text-center hidden sm:block">
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-text-muted hover:text-accent transition-colors"
                      title={resource.url}
                    >
                      &#8599;
                    </a>
                  ) : (
                    <span className="text-text-muted/30">--</span>
                  )}
                </span>

                {/* Date */}
                <span className="text-xs text-text-muted font-mono shrink-0 w-16 text-right">
                  {formatShortDate(resource._creationTime)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
