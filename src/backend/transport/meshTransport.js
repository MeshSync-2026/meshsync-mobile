// meshTransport.js
// Abstract interface for mesh transports

export class MeshTransport {
  constructor() {
    this.listeners = new Set();
  }

  /**
   * Start the transport layer (scanning, advertising, connecting).
   */
  async start() {
    throw new Error("start() not implemented");
  }

  /**
   * Stop the transport layer.
   */
  async stop() {
    throw new Error("stop() not implemented");
  }

  /**
   * Send a list of events to connected peers or broadcast them.
   * @param {Array} events
   */
  async sendEvents(events) {
    throw new Error("sendEvents() not implemented");
  }

  /**
   * Register a listener for events received over this transport.
   * @param {function} callback - Callback function(events)
   */
  onEventsReceived(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emit received events to all registered listeners.
   * @param {Array} events
   */
  emitEvents(events) {
    for (const listener of this.listeners) {
      try {
        listener(events);
      } catch (err) {
        console.error("Error in transport event listener:", err);
      }
    }
  }

  /**
   * Get the connection/active status.
   * @returns {boolean}
   */
  get isConnected() {
    return false;
  }
}
