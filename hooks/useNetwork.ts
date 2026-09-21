import { useEffect, useState } from 'react';

import {
  getNetworkState,
  isStateOnline,
  startNetworkMonitor,
  subscribeToNetwork,
} from '@/services/network/networkService';

export function useNetwork() {
  const [online, setOnline] = useState(true);
  const [type, setType] = useState<string>('unknown');

  useEffect(() => {
    startNetworkMonitor();
    void getNetworkState().then((state) => {
      setOnline(isStateOnline(state));
      setType(state.type);
    });
    return subscribeToNetwork((nextOnline, state) => {
      setOnline(nextOnline);
      setType(state.type);
    });
  }, []);

  return { online, type };
}
