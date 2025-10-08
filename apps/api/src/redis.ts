export class Redis {
constructor(private url: string, private token: string) {}
async lpush(key: string, value: unknown) {
return this.call('LPUSH', [key, JSON.stringify(value)]);
}
async rpop<T = unknown>(key: string): Promise<T | null> {
const res = await this.call('RPOP', [key]);
if (!res || res.result === null) return null;
return JSON.parse(res.result) as T;
}
async call(cmd: string, args: string[]) {
const r = await fetch(`${this.url}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
headers: { Authorization: `Bearer ${this.token}` },
});
return r.json();
}
}
