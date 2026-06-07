import { useEffect, useRef, useState } from 'react';
import {
  AbrController,
  ABR_CONFIG,
  collectMetrics,
  applyEncodingParameters,
} from '../lib/abr.js';

export function useAbr({ pcRef, videoSenderRef, enabled }) {
  const [info, setInfo] = useState({
    state: 'STABLE',
    decision: null,
    bitrateMbps: null,
  });
  const controllerRef = useRef(null);
  const prevRef = useRef({ bytes: 0, ts: 0 });

  useEffect(() => {
    if (!enabled) return undefined;

    controllerRef.current = new AbrController(ABR_CONFIG);
    prevRef.current = { bytes: 0, ts: 0 };

    const id = setInterval(async () => {
      const pc = pcRef.current;
      const sender = videoSenderRef.current;
      if (!pc || pc.connectionState !== 'connected') return;

      try {
        const metrics = await collectMetrics(pc);

        const nowTs = Date.now();
        const prev = prevRef.current;
        let actualBps = 0;
        if (prev.ts > 0 && metrics.bytesSent > prev.bytes) {
          const dt = (nowTs - prev.ts) / 1000;
          if (dt > 0) actualBps = ((metrics.bytesSent - prev.bytes) * 8) / dt;
        }
        prevRef.current = { bytes: metrics.bytesSent, ts: nowTs };

        const decision = controllerRef.current.update(metrics);
        await applyEncodingParameters(sender, decision);

        setInfo({
          state: decision.state,
          decision,
          bitrateMbps: actualBps > 0 ? actualBps / 1e6 : null,
        });
      } catch (e) {
        console.warn('ABR step failed:', e);
      }
    }, ABR_CONFIG.pollIntervalMs);

    return () => clearInterval(id);
  }, [enabled, pcRef, videoSenderRef]);

  return info;
}
