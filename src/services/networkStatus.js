/**
 * Network Connectivity & Offline Status Service
 * Conforms to SRS NFR-REL-05 and MKT-10.
 *
 * Provides real-time network status monitoring, event listeners for
 * online/offline transitions, and simulation capabilities for automated testing.
 */

class NetworkStatusService {
  constructor() {
    this.listeners = new Set();
    this.simulatedStatus = null; // null means use navigator.onLine

    if (typeof window !== 'undefined') {
      this.handleOnline = () => this.notify(true);
      this.handleOffline = () => this.notify(false);

      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Current online status.
   * @returns {boolean}
   */
  isOnline() {
    if (this.simulatedStatus !== null) {
      return this.simulatedStatus;
    }
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.onLine === 'boolean'
    ) {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Current offline status.
   * @returns {boolean}
   */
  isOffline() {
    return !this.isOnline();
  }

  /**
   * Subscribes a listener callback to connectivity changes.
   *
   * @param {(isOnline: boolean) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifies all registered listeners of a status change.
   * @private
   */
  notify(isOnline) {
    for (const listener of this.listeners) {
      try {
        listener(isOnline);
      } catch {
        // Prevent listener error from interrupting dispatch
      }
    }
  }

  /**
   * Simulates online or offline state (useful for automated testing or demo modes).
   *
   * @param {boolean|null} status - True for online, false for offline, null to restore native.
   */
  setSimulatedStatus(status) {
    const prev = this.isOnline();
    this.simulatedStatus = typeof status === 'boolean' ? status : null;
    const current = this.isOnline();
    if (prev !== current) {
      this.notify(current);
    }
  }

  /**
   * Resets simulation and cleans up listeners if needed.
   */
  reset() {
    this.simulatedStatus = null;
  }
}

export const networkStatus = new NetworkStatusService();
export default networkStatus;
