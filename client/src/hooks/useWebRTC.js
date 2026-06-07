import { useEffect, useRef, useState } from 'react';
import { ICE_CONFIG } from '../config.js';
import { preferCodec } from '../lib/codecs.js';

export function useWebRTC({ signaling, localStream }) {
  const pcRef = useRef(null);
  const videoSenderRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('new');

  useEffect(() => {
    if (!signaling || !localStream) return undefined;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    const pendingCandidates = [];
    let remoteReady = false;

    localStream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, localStream);
      if (track.kind === 'video') videoSenderRef.current = sender;
    });

    pc.getTransceivers().forEach((t) => {
      const kind = t.sender?.track?.kind;
      if (kind === 'video') preferCodec(t, 'video', 'video/VP9');
      if (kind === 'audio') preferCodec(t, 'audio', 'audio/opus');
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) signaling.send({ type: 'ice-candidate', payload: candidate });
    };
    pc.ontrack = ({ streams }) => setRemoteStream(streams[0]);
    pc.onconnectionstatechange = () => setConnectionState(pc.connectionState);

    const flushCandidates = async () => {
      remoteReady = true;
      while (pendingCandidates.length) {
        const candidate = pendingCandidates.shift();
        try {
          await pc.addIceCandidate(candidate);
        } catch (e) {
          console.warn('addIceCandidate (flush):', e);
        }
      }
    };

    const offs = [];

    offs.push(
      signaling.on('peer-joined', async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signaling.send({ type: 'offer', payload: pc.localDescription });
        } catch (e) {
          console.error('createOffer:', e);
        }
      })
    );

    offs.push(
      signaling.on('offer', async (offer) => {
        try {
          await pc.setRemoteDescription(offer);
          await flushCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signaling.send({ type: 'answer', payload: pc.localDescription });
        } catch (e) {
          console.error('handle offer:', e);
        }
      })
    );

    offs.push(
      signaling.on('answer', async (answer) => {
        try {
          await pc.setRemoteDescription(answer);
          await flushCandidates();
        } catch (e) {
          console.error('handle answer:', e);
        }
      })
    );

    offs.push(
      signaling.on('ice-candidate', async (candidate) => {
        if (!candidate) return;
        if (remoteReady && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (e) {
            console.warn('addIceCandidate:', e);
          }
        } else {
          pendingCandidates.push(candidate);
        }
      })
    );

    offs.push(signaling.on('peer-left', () => setRemoteStream(null)));
    offs.push(
      signaling.on('room-full', () =>
        console.warn('room is already full (two participants)')
      )
    );

    signaling.join();

    return () => {
      offs.forEach((off) => off());
      try {
        pc.close();
      } catch {
      }
      pcRef.current = null;
      videoSenderRef.current = null;
    };
  }, [signaling, localStream]);

  return { pc: pcRef, videoSender: videoSenderRef, remoteStream, connectionState };
}
