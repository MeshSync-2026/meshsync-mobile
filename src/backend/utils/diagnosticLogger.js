// diagnosticLogger.js
// In-App Diagnostic Logging & Hardware State Tracker for MeshSync

class DiagnosticLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 150;
    this.listeners = new Set();
    this.state = {
      nodeId: null,
      permissions: {},
      adapterState: "Unknown",
      peripheralStatus: "Stopped",
      peripheralError: null,
      scannerStatus: "Stopped",
      scannerError: null,
      discoveredPeers: [],
      lastSyncAttempt: null,
      lastSyncResult: null,
      eventsIngestedCount: 0,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.getSnapshot());
      } catch (_) {}
    }
  }

  updateState(partial) {
    this.state = { ...this.state, ...partial };
    this._notify();
  }

  log(level, tag, message, details = null) {
    const time = new Date().toLocaleTimeString();
    const entry = {
      id: Math.random().toString(36).substring(2, 9),
      time,
      timestamp: Date.now(),
      level, // 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'
      tag,
      message: String(message),
      details: details ? (typeof details === "object" ? JSON.stringify(details) : String(details)) : null,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    const consoleFn =
      level === "ERROR"
        ? console.error
        : level === "WARN"
        ? console.warn
        : console.log;
    consoleFn(`[${level}][${tag}] ${entry.message}${entry.details ? " - " + entry.details : ""}`);

    this._notify();
  }

  info(tag, message, details) {
    this.log("INFO", tag, message, details);
  }

  success(tag, message, details) {
    this.log("SUCCESS", tag, message, details);
  }

  warn(tag, message, details) {
    this.log("WARN", tag, message, details);
  }

  error(tag, message, details) {
    this.log("ERROR", tag, message, details);
  }

  clearLogs() {
    this.logs = [];
    this._notify();
  }

  getSnapshot() {
    return {
      state: { ...this.state },
      logs: [...this.logs],
    };
  }

  exportLogsAsText() {
    const header = [
      `=== MESHSYNC BLE DIAGNOSTIC DUMP ===`,
      `Time: ${new Date().toISOString()}`,
      `Node ID: ${this.state.nodeId || "unknown"}`,
      `Adapter State: ${this.state.adapterState}`,
      `Peripheral Status: ${this.state.peripheralStatus}${this.state.peripheralError ? " (" + this.state.peripheralError + ")" : ""}`,
      `Scanner Status: ${this.state.scannerStatus}${this.state.scannerError ? " (" + this.state.scannerError + ")" : ""}`,
      `Discovered Peers: ${JSON.stringify(this.state.discoveredPeers)}`,
      `Permissions: ${JSON.stringify(this.state.permissions)}`,
      `Total Events Ingested: ${this.state.eventsIngestedCount}`,
      `\n=== LOG TRACE (${this.logs.length} entries) ===`,
    ].join("\n");

    const entries = this.logs
      .slice()
      .reverse()
      .map(
        (l) =>
          `[${l.time}] [${l.level}] [${l.tag}] ${l.message}${l.details ? " | " + l.details : ""}`
      )
      .join("\n");

    return `${header}\n${entries}\n=== END DUMP ===`;
  }
}

export const diagLog = new DiagnosticLogger();
