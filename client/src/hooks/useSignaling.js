import { useEffect, useState } from 'react';
import { SignalingClient } from '../lib/signaling.js';
import { SIGNALING_URL } from '../config.js';

export function useSignaling(roomId) {
  const [signaling, setSignaling] = useState(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!roomId) return undefined;

    const client = new SignalingClient(SIGNALING_URL, roomId);
    let alive = true;

    client
      .connect()
      .then(() => {
        if (alive) {
          setStatus('connected');
          setSignaling(client);
        }
      })
      .catch(() => {
        if (alive) setStatus('error');
      });

    return () => {
      alive = false;
      client.close();
      setSignaling(null);
    };
  }, [roomId]);

  return { signaling, status };
}
