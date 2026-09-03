const EDGE_SYNC_URL = "https://your-edge-sync-service.example.com";
const COMMAND_CENTER_URL = "https://your-command-center-service.example.com";

export async function ingestBatch(events, uploadingNodeId) {
  const res = await fetch(`${EDGE_SYNC_URL}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events, uploading_node_id: uploadingNodeId }),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
  return res.json(); // { batch_id, new_count, duplicate_count, rejected_count, items }
}

export async function loginOfficer(username, password) {
  const res = await fetch(`${COMMAND_CENTER_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function registerDevice(nodeId, authorityUserId) {
  const res = await fetch(`${COMMAND_CENTER_URL}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node_id: nodeId, authority_user_id: authorityUserId }),
  });
  if (!res.ok) throw new Error("Device registration failed");
  return res.json();
}
