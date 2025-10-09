import { useEffect, useRef, useState } from "react";

// Cloudflare Pages will inject NEXT_PUBLIC_API_URL at build-time.
// Fallback to your Worker URL for local/dev.
const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://nuros-grid-api.oiramix3.workers.dev";

// Small hook to run an interval that survives re-renders
function useInterval(cb: () => void, delay: number | null) {
  const saved = useRef(cb);
  useEffect(() => {
    saved.current = cb;
  }, [cb]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default function ConsolePage() {
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  async function createJob() {
    const res = await fetch(`${API}/v1/jobs/create`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "upscale_x4", inUrls: [url] }),
    });
    const data = await res.json();
    setJobId(data.id);
    setStatus("queued");
    setResultUrl("");
  }

  // Poll job status once we have an id
  useInterval(async () => {
    if (!jobId) return;
    try {
      const r = await fetch(`${API}/v1/jobs/${jobId}/status`);
      const d = await r.json();
      if (d?.status) setStatus(d.status);
      if (d?.status === "done" && d?.url) setResultUrl(d.url);
    } catch {
      /* ignore transient errors */
    }
  }, jobId ? 1500 : null);

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", fontFamily: "system-ui" }}>
      <h2>Buyer Console</h2>
      <p>Test job: Upscale x4 an image URL.</p>

      <input
        placeholder="Image URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
      <button onClick={createJob} style={{ marginTop: 12 }}>
        Create Job
      </button>

      {jobId && (
        <div style={{ marginTop: 12 }}>
          <div>Job: {jobId}</div>
          <div>Status: {status || "…"}</div>
          {resultUrl && (
            <div>
              Result:{" "}
              <a href={resultUrl} target="_blank" rel="noreferrer">
                {resultUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
