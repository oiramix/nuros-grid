import { useEffect, useRef, useState } from "react";

const API = process.env.https://nuros-grid-api.oiramix3.workers.dev; // e.g. https://nuros-grid-api.<your>.workers.dev

export default function ConsolePage() {
  const [url, setUrl] = useState(
    "https://www.aspca.org/sites/default/files/cat-care_meowing-and-yowling_main-image.jpg"
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function createJob() {
    setJobId(null);
    setStatus("");
    setResultUrl("");

    const res = await fetch(`${API}/v1/jobs/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "upscale_x4",
        inUrls: [url],
        args: {},
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      setStatus(`Create failed: ${res.status} ${txt}`);
      return;
    }

    const { id } = await res.json();
    setJobId(id);
    setStatus("queued");

    // Poll status every 1.5s
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      try {
        const sRes = await fetch(`${API}/v1/jobs/${id}/status`);
        const data = await sRes.json();
        const st = data?.status ?? "unknown";
        setStatus(st);

        // If API saved a result link, show it
        if (st === "done" && data?.result) {
          setResultUrl(data.result);
          clearInterval(timerRef.current);
        }
      } catch (e: any) {
        // ignore one-off errors in polling
      }
    }, 1500);
  }

  return (
    <div style={{ maxWidth: 900, padding: 24, fontFamily: "system-ui, Arial" }}>
      <h1>Buyer Console</h1>

      <p>Test job: Upscale x4 an image URL.</p>

      <input
        style={{ width: "100%", padding: 8 }}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/image.jpg"
      />
      <div style={{ height: 12 }} />

      <button onClick={createJob} style={{ padding: "6px 12px" }}>
        Create Job
      </button>

      <div style={{ height: 16 }} />
      {jobId && (
        <div>
          <div>Job created: <code>{jobId}</code></div>
          <div>Status: <strong>{status || "…"}</strong></div>

          {status === "done" && resultUrl && (
            <div style={{ marginTop: 8 }}>
              Result:{" "}
              <a href={resultUrl} target="_blank" rel="noreferrer">
                Download / View
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
