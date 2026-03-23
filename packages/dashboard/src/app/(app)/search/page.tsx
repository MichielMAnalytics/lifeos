'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  snippet?: string;
  date?: string;
}

interface SearchResponse {
  data: SearchResult[];
  count: number;
}

const typeBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  tasks: 'default',
  goals: 'success',
  ideas: 'warning',
  journal: 'muted',
  resources: 'default',
  projects: 'success',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setCount(0);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `${API_URL}/api/v1/search?q=${encodeURIComponent(q.trim())}`,
      );
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data: SearchResponse = await res.json();
      setResults(data.data);
      setCount(data.count);
    } catch {
      setResults([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>(
    (acc, result) => {
      const key = result.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(result);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text">Search</h1>

      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks, goals, ideas, journal, resources..."
          autoFocus
          className="w-full rounded-md border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {loading && (
        <p className="text-sm text-text-muted">Searching...</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-text-muted">
          No results found for &quot;{query}&quot;.
        </p>
      )}

      {!loading && results.length > 0 && (
        <p className="text-xs text-text-muted">{count} result(s)</p>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant={typeBadgeVariant[type] ?? 'muted'}>
                {type}
              </Badge>
              <span>{items.length}</span>
            </CardTitle>
          </CardHeader>

          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-md px-3 py-2 transition-colors hover:bg-surface-hover"
              >
                <p className="text-sm text-text">{item.title}</p>
                {item.snippet && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">
                    {item.snippet}
                  </p>
                )}
                {item.date && (
                  <p className="mt-0.5 text-xs text-text-muted">{item.date}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
