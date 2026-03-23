import { getApiKey, getApiUrl } from './config.js';

export class ApiClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    path: string,
    opts?: { params?: Record<string, string>; body?: unknown },
  ): Promise<T> {
    const url = this.buildUrl(path, opts?.params);
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      let message = `HTTP ${res.status} ${res.statusText}`;
      try {
        const errBody = (await res.json()) as { error?: string };
        if (errBody.error) {
          message = errBody.error;
        }
      } catch {
        // ignore parse failure, use default message
      }
      throw new Error(message);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  async del<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export function createClient(): ApiClient {
  const baseUrl = getApiUrl();
  const apiKey = getApiKey();
  return new ApiClient(baseUrl, apiKey);
}
