export const SIGNALING_URL =
  import.meta.env.VITE_SIGNALING_URL ||
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

const turnServers = import.meta.env.VITE_TURN_URL
  ? [
      {
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USER,
        credential: import.meta.env.VITE_TURN_PASS,
      },
    ]
  : [];

export const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...turnServers,
  ],
  iceCandidatePoolSize: 4,
};

export const MEDIA_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
};
