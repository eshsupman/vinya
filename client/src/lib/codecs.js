export function preferCodec(transceiver, kind, mimeType) {
  if (
    !transceiver ||
    typeof transceiver.setCodecPreferences !== 'function' ||
    typeof RTCRtpReceiver === 'undefined' ||
    typeof RTCRtpReceiver.getCapabilities !== 'function'
  ) {
    return;
  }

  const capabilities = RTCRtpReceiver.getCapabilities(kind);
  if (!capabilities || !capabilities.codecs) return;

  const target = mimeType.toLowerCase();
  const preferred = capabilities.codecs.filter(
    (c) => c.mimeType.toLowerCase() === target
  );
  const others = capabilities.codecs.filter(
    (c) => c.mimeType.toLowerCase() !== target
  );

  if (preferred.length === 0) return;

  try {
    transceiver.setCodecPreferences([...preferred, ...others]);
  } catch (e) {
    console.warn('setCodecPreferences failed:', e);
  }
}
