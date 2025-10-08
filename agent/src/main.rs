use serde::{Deserialize, Serialize};
use std::{thread, time::Duration};


#[derive(Deserialize, Debug)]
struct JobSpec {
id: String,
kind: String,
args: serde_json::Value,
inUrls: Vec<String>,
outUrl: String,
}


fn main() {
let api = std::env::var("NUROS_API").unwrap_or_else(|_| "https://YOUR-WORKER.SUBDOMAIN.workers.dev".into());
let key = std::env::var("NUROS_KEY").expect("Set NUROS_KEY=your_agent_key");


loop {
// Heartbeat
let _ = ureq::post(&format!("{}/v1/agent/heartbeat", api))
.set("x-api-key", &key)
.send_json(serde_json::json!({"vram_gb": 12, "cuda": "12.4", "driver": "555.xx"}));


// Claim
let resp = ureq::post(&format!("{}/v1/agent/claim", api)).set("x-api-key", &key).call();
if resp.status() == 204 {
thread::sleep(Duration::from_secs(3));
continue;
}
if !resp.ok() {
eprintln!("claim error: {}", resp.status());
thread::sleep(Duration::from_secs(5));
continue;
}
let job: JobSpec = resp.into_json().unwrap();
println!("claimed job {} kind {}", job.id, job.kind);


// TODO: Download inputs -> run pipeline -> produce result.zip
// For MVP, just wait and finalize empty result.
thread::sleep(Duration::from_secs(2));


// In a real agent, upload parts to R2 via multipart, then finalize:
let _ = ureq::post(&format!("{}/v1/jobs/{}/finalize", api, job.id))
.send_json(serde_json::json!({
"key": serde_json::from_str::<serde_json::Value>(&job.outUrl).unwrap()["key"].as_str().unwrap(),
"uploadId": serde_json::from_str::<serde_json::Value>(&job.outUrl).unwrap()["uploadId"].as_str().unwrap(),
"parts": [] as [serde_json::Value; 0]
}));
}
}
