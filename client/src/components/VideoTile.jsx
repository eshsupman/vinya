import { useEffect, useRef } from 'react';

export default function VideoTile({
  stream,
  muted = false,
  mirrored = false,
  className = '',
  label,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className={className}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
      />
      {label && <span className="tile-label">{label}</span>}
    </div>
  );
}
