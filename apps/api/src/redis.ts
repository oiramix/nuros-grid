// apps/api/src/redis.ts

export class Redis {
  constructor(private url: string, private token: string) {}

  // ⬅️ make this PUBLIC
  async call(cmd: string, args: (string | number | object)[]) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Upstash REST expects: { "command": ["HSET","key","field","value", ...] }
        // but they also accept ["cmd", ...] directly under "command"
        command: [cmd, ...args],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upstash error (${res.status}): ${text}`);
    }
    return res.json(); // { result: ... }
  }

  async lpush(key: string, value: unknown) {
    return this.call('LPUSH', [key, JSON.stringify(value)]);
  }

  async rpop<T>(key: string): Promise<T | null> {
    const r = await this.call('RPOP', [key]);
    if (!r?.result) return null;
    try {
      return JSON.parse(r.result) as T;
    } catch {
      return null;
    }
  }

  async hset(key: string, fields: Record<string, string>) {
    const flat: (string | number)[] = [];
    for (const [k, v] of Object.entries(fields)) flat.push(k, v);
    return this.call('HSET', [key, ...flat]);
  }

  async hgetall(key: string) {
    return this.call('HGETALL', [key]);
  }
}
