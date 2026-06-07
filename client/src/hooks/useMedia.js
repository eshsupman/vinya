import { useEffect, useRef, useState, useCallback } from 'react';
import { MEDIA_CONSTRAINTS } from '../config.js';

export function useMedia() {
  const [localStream, setLocalStream] = useState(null);
  const [error, setError] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia(MEDIA_CONSTRAINTS)
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setLocalStream(stream);
      })
      .catch((e) => setError(e));

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const toggleMic = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicOn(stream.getAudioTracks()[0]?.enabled ?? false);
  }, []);

  const toggleCam = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCamOn(stream.getVideoTracks()[0]?.enabled ?? false);
  }, []);

  return { localStream, error, micOn, camOn, toggleMic, toggleCam };
}
