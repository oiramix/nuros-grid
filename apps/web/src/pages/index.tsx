import Link from 'next/link';


export default function Home() {
return (
<main style={{ maxWidth: 860, margin: '80px auto', fontFamily: 'system-ui' }}>
<h1>Nuros Grid</h1>
<p>Rent fast GPUs for AI image tasks. Contributors earn by sharing idle RTX 40/50 GPUs.</p>
<div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
<Link href="/console">Buyer Console →</Link>
<Link href="/contribute">Become a Contributor →</Link>
</div>
<section style={{ marginTop: 48 }}>
<h3>Live Capacity</h3>
<p>Online GPUs: <b id="cap">1</b> · Avg Queue: <b>~0s</b></p>
</section>
</main>
);
}
