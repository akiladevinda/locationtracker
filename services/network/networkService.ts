import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { logger } from '@/services/logger';

type NetworkListener = (online: boolean, state: NetInfoState) => void;

let started = false;
let lastOnline: boolean | null = null;
const listeners = new Set<NetworkListener>();
let unsubscribe: (() => void) | null = null;

export function isStateOnline(state: NetInfoState): boolean {
  if (state.isConnected !== true) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return true;
}

export async function getNetworkState(): Promise<NetInfoState> {
  return NetInfo.fetch();
}

export async function isOnline(): Promise<boolean> {
  return isStateOnline(await getNetworkState());
}

export function subscribeToNetwork(listener: NetworkListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startNetworkMonitor(): void {
  if (started) {
    return;
  }
  started = true;
  unsubscribe = NetInfo.addEventListener((state) => {
    const online = isStateOnline(state);
    if (lastOnline !== online) {
      logger.info('network status', online ? 'online' : 'offline');
      lastOnline = online;
    }
    for (const listener of listeners) {
      listener(online, state);
    }
  });
}

export function stopNetworkMonitor(): void {
  unsubscribe?.();
  unsubscribe = null;
  started = false;
}
