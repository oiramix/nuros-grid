import { useState } from 'react';


export default function Console() {
const [url, setUrl] = useState('');
const [jobId, setJobId] = useState<string | null>(null);


async function submitJob() {
const api = process.env.NEXT_PUBLIC_API_URL ?? 'https://YOUR-WORKER.SUBDOMAIN.workers.dev';
const res = await fetch(api + '/v1/jobs/create', {
method: 'POST',
headers: { 'content-type': 'application/json' },
body: JSON.stringify({ kind: 'upscale_x4', inUrls: [url] })
});
const data = await res.json();
setJobId(data.id);
}


return (
<main style={{ maxWidth: 860, margin: '40px auto', fontFamily: 'system-ui' }}>
<h2>Buyer Console</h2>
<p>Test job: Upscale x4 an image URL.</p>
<input placeholder="Image URL" value={url} onChange={(e)=>setUrl(e.target.value)} style={{ width: '100%', padding: 8 }}/>
<button onClick={submitJob} style={{ marginTop: 12 }}>Create Job</button>
{jobId && <p>Job created: {jobId}</p>}
</main>
);
}
