// wsTransport.js
// Production WebSocket Edge Transport (Path B)

import NetInfo from "@react-native-community/netinfo";
import { MeshTransport } from "./meshTransport";
import { getStore } from "../store/eventStore";
import { getNodeId } from "../store/hotState";
import { isMockCloudEvent } from "../cloudSync";

// No fake default: without EXPO_PUBLIC_EDGE_SYNC_WS_URL the relay stays
// disabled (one log line) instead of retrying an unresolvable host forever.
export const DEFAULT_EDGE_SYNC_WS_URL =
  process.env.EXPO_PUBLIC_EDGE_SYNC_WS_URL || null;

const PING_INTERVAL_MS = 25000; // Send heartbeat every 25 seconds
const PING_TIMEOUT_MS = 10000;  // Force reconnect if no response in 10s
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

export class WsTransport extends MeshTransport {
  constructor(url = DEFAULT_EDGE_SYNC_WS_URL) {
    super();
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.started = false;
    this.peerCount = 0;

    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pingTimeoutTimer = null;
    this.netInfoUnsubscribe = null;
  }

  setUrl(newUrl) {
    if (this.url !== newUrl) {
      this.url = newUrl;
      if (this.started) {
        this._disconnect(false);
        this._connect();
      }
    }
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.reconnectAttempts = 0;

    if (!this.url) {
      console.log("[WS Transport] No EXPO_PUBLIC_EDGE_SYNC_WS_URL configured — relay disabled (set it in .env)");
      return;
    }

    // Listen to network transitions (offline -> online) for instant reconnect
    try {
      this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected && !this.connected && this.started) {
          console.log("[WS Transport] Network restored, reconnecting immediately...");
          this._clearReconnectTimer();
          this.reconnectAttempts = 0;
          this._connect();
        }
      });
    } catch (err) {
      console.warn("[WS Transport] NetInfo listener failed:", err.message);
    }

    this._connect();
  }

  stop() {
    this.started = false;
    this._disconnect(true);

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
  }

  _connect() {
    if (!this.started || this.connected) return;
    // Guard against parallel connects: NetInfo + reconnect timers can fire
    // while a handshake is still in-flight — without this each fire opened
    // another socket (the 6× "Connected" logs) and leaked the extras.
    if (this.ws && this.ws.readyState === 0) return;
    this._clearReconnectTimer();

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.peerCount = Math.max(this.peerCount, 1);
        console.log(`[WS Transport] Connected to ${this.url}`);

        // Register node identity with edge server
        this._safeSend({
          type: "register",
          nodeId: getNodeId(),
          timestamp: Date.now(),
        });

        this._startHeartbeat();
      };

      this.ws.onmessage = async (msg) => {
        this._handleHeartbeatResponse();

        try {
          const data = JSON.parse(msg.data);

          if (data.type === "events") {
            const store = getStore();
            const validIncoming = [];

            for (const evt of data.events || []) {
              if (!evt || !evt.id || isMockCloudEvent(evt)) continue;
              const seen = await store.hasSeen(evt.origin_node_id, evt.seq);
              if (seen) continue;

              await store.insert(evt);
              await store.markSeen(evt.origin_node_id, evt.seq);
              validIncoming.push(evt);
            }

            if (validIncoming.length > 0) {
              this.emitEvents(validIncoming);
            }
          } else if (data.type === "peer_count") {
            this.peerCount = typeof data.count === "number" ? data.count : 1;
          } else if (data.type === "ping") {
            this._safeSend({ type: "pong", timestamp: Date.now() });
          }
        } catch (err) {
          console.error("[WS Transport] Error in onmessage:", err);
        }
      };

      this.ws.onclose = (event) => {
        const wasConnected = this.connected;
        this.connected = false;
        this.peerCount = 0;
        this._stopHeartbeat();

        if (this.started) {
          if (wasConnected) {
            console.log(`[WS Transport] Connection closed (${event?.code || "unknown"}). Scheduling reconnect...`);
          }
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[WS Transport] WebSocket error:", err?.message || err);
      };
    } catch (err) {
      console.error("[WS Transport] Connection initialization failed:", err);
      this._scheduleReconnect();
    }
  }

  _disconnect(permanent = false) {
    this.connected = false;
    this.peerCount = 0;
    this._stopHeartbeat();
    this._clearReconnectTimer();

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (err) {
        // ignore close error
      }
      this.ws = null;
    }

    if (!permanent && this.started) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (!this.started || this.reconnectTimer) return;

    // Exponential backoff with jitter
    const delay = Math.min(
      MAX_RECONNECT_DELAY_MS,
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts)
    ) + Math.random() * 1000;

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._connect();
    }, delay);
  }

  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.connected) return;

      this._safeSend({ type: "ping", timestamp: Date.now() });

      // Start watchdog timer: if no message received within timeout, drop connection
      if (this.pingTimeoutTimer) clearTimeout(this.pingTimeoutTimer);
      this.pingTimeoutTimer = setTimeout(() => {
        // Expected when JS was paused (app idle/backgrounded) — the connection
        // is still fine in most cases; a quiet close+reconnect recovers it.
        console.log("[WS Transport] Heartbeat ping timed out — reconnecting...");
        if (this.ws) {
          try {
            this.ws.close();
          } catch (err) {
            // ignore
          }
        }
      }, PING_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
  }

  _handleHeartbeatResponse() {
    if (this.pingTimeoutTimer) {
      clearTimeout(this.pingTimeoutTimer);
      this.pingTimeoutTimer = null;
    }
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pingTimeoutTimer) {
      clearTimeout(this.pingTimeoutTimer);
      this.pingTimeoutTimer = null;
    }
  }

  _safeSend(payload) {
    if (!this.connected || !this.ws || this.ws.readyState !== 1) return false;
    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error("[WS Transport] Failed to send message:", err);
      return false;
    }
  }

  async sendEvents(events) {
    return this.broadcast(events);
  }

  async broadcast(events) {
    if (!events || !Array.isArray(events) || events.length === 0) return;
    if (!this.connected) return;

    const store = getStore();
    for (const e of events) {
      if (e.origin_node_id && typeof e.seq === "number") {
        await store.markSeen(e.origin_node_id, e.seq);
      }
    }

    this._safeSend({ type: "events", events });
  }

  get isConnected() {
    return this.connected;
  }

  getPeerCount() {
    return this.peerCount;
  }
}
