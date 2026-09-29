import { getResponderToken } from "./store/hotState";

const EDGE_SYNC_URL =
  process.env.EXPO_PUBLIC_EDGE_SYNC_URL || "http://localhost:4001";
const COMMAND_CENTER_URL =
  process.env.EXPO_PUBLIC_CC_URL || "http://localhost:4002";

function authHeaders() {
  const token = getResponderToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function ingestBatch(events, uploadingNodeId) {
  const res = await fetch(`${EDGE_SYNC_URL}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events, uploading_node_id: uploadingNodeId }),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
  return res.json(); // { batch_id, new_count, duplicate_count, rejected_count, items }
}

export async function pullEvents(sinceHlc) {
  const url = `${EDGE_SYNC_URL}/sync${sinceHlc ? `?since_hlc=${encodeURIComponent(sinceHlc)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  const body = await res.json();
  return body.events || [];
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ node_id: nodeId, authority_user_id: authorityUserId }),
  });
  if (!res.ok) throw new Error("Device registration failed");
  return res.json();
}
