'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';
import type { Id } from '@/lib/convex-api';

function AddImageForm({ onDone }: { onDone: () => void }) {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  const addImage = useMutation(api.visionBoard.add);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    setSaving(true);
    try {
      const args: { imageUrl: string; caption?: string } = {
        imageUrl: imageUrl.trim(),
      };
      if (caption.trim()) args.caption = caption.trim();
      await addImage(args);
      setImageUrl('');
      setCaption('');
      onDone();
    } catch (err) {
      console.error('Failed to add image:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-xl bg-surface p-4 space-y-3">
      <input
        type="url"
        placeholder="Paste image URL..."
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        autoFocus
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
      />
      <input
        type="text"
        placeholder="Caption (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving || !imageUrl.trim()}>
          {saving ? 'Adding...' : 'Add Image'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ImageCard({
  id,
  imageUrl,
  caption,
}: {
  id: Id<'visionBoard'>;
  imageUrl: string;
  caption?: string;
}) {
  const [hovering, setHovering] = useState(false);
  const removeImage = useMutation(api.visionBoard.remove);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeImage({ id });
    } catch (err) {
      console.error('Failed to remove image:', err);
      setRemoving(false);
    }
  }

  return (
    <div
      className="relative group border border-border rounded-xl overflow-hidden"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-surface">
        <img
          src={imageUrl}
          alt={caption || 'Vision board image'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Caption overlay */}
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
          <p className="text-sm text-white leading-snug">{caption}</p>
        </div>
      )}

      {/* Delete button on hover */}
      {hovering && (
        <button
          onClick={handleRemove}
          disabled={removing}
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-danger transition-colors"
          title="Remove image"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function VisionBoard() {
  const images = useQuery(api.visionBoard.list);
  const [showForm, setShowForm] = useState(false);

  if (images === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Vision Board
        </h2>
        <div className="flex items-center gap-3">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-6 pt-4">
          <AddImageForm onDone={() => setShowForm(false)} />
        </div>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-text-muted">No images yet</p>
          <p className="text-xs text-text-muted mt-1">
            Add images that represent your vision
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
          {images.map((img) => (
            <ImageCard
              key={img._id}
              id={img._id}
              imageUrl={img.imageUrl}
              caption={img.caption}
            />
          ))}
        </div>
      )}
    </div>
  );
}
