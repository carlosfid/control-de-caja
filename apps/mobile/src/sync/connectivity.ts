export interface ConnectivitySnapshot {
  deviceOnline: boolean;
  serverReachable: boolean;
}

export function createConnectivity(serverUrl: string, timeoutMs = 3000) {
  let snapshot: ConnectivitySnapshot = {
    deviceOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    serverReachable: false,
  };
  const subscribers = new Set<(snapshot: ConnectivitySnapshot) => void>();

  const emit = () => subscribers.forEach((callback) => callback(snapshot));

  const onOnline = () => {
    snapshot = { ...snapshot, deviceOnline: true };
    void isServerReachable().finally(emit);
  };
  const onOffline = () => {
    snapshot = { deviceOnline: false, serverReachable: false };
    emit();
  };

  async function isServerReachable(): Promise<boolean> {
    if (!serverUrl || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      snapshot = { deviceOnline: typeof navigator === 'undefined' ? true : navigator.onLine, serverReachable: false };
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${serverUrl.replace(/\/$/, '')}/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      snapshot = { deviceOnline: true, serverReachable: response.ok };
      return response.ok;
    } catch {
      snapshot = { deviceOnline: true, serverReachable: false };
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
  }

  return {
    getSnapshot: () => snapshot,
    isServerReachable,
    watch: (callback: (snapshot: ConnectivitySnapshot) => void) => {
      subscribers.add(callback);
      callback(snapshot);
      return () => subscribers.delete(callback);
    },
    dispose: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      }
      subscribers.clear();
    },
  };
}
