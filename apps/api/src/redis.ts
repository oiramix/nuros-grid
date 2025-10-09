// apps/api/src/redis.ts
type UpstashResponse<T> = { result: T };

function esc(x: string | number | boolean) {
  return encodeURIComponent(String(x));
}

export class Redis {
  constructor(
    private url: string,
    private token: string
  ) {}

  // Core call that *returns the unwrapped result* (not the whole JSON).
  public async call<T>(
    cmd: string,
    args: Array<string | number | boolean> = []
  ): Promise<T> {
    const endpoint = `${this.url}/${cmd}/${args.map(esc).join('/')}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstash ${cmd} failed: ${res.status} ${text}`);
    }
    const json = (await res.json()) as UpstashResponse<T>;
    return json.result;
  }

  // Convenience helpers we use in routes:

  public async lpush(key: string, value: unknown): Promise<number> {
    return this.call<number>('LPUSH', [key, JSON.stringify(value)]);
  }

  public async rpop<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.call<string | null>('RPOP', [key]);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  public async hgetall(key: string): Promise<string[]> {
    // Returns flat array: ["field","value","field2","value2",...]
    return this.call<string[]>('HGETALL', [key]);
  }

  public async hset(key: string, fields: Record<string, string>): Promise<number> {
    const flat = Object.entries(fields).flat();
    return this.call<number>('HSET', [key, ...flat]);
  }
}
