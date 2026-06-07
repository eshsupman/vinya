const STATE_STYLE = {
  STABLE: { color: '#27AE60', label: 'Хорошее качество' },
  DEGRADING: { color: '#E67E22', label: 'Качество снижено' },
  RECOVERING: { color: '#2980B9', label: 'Восстановление' },
};

export default function ChannelIndicator({ state, decision, bitrateMbps }) {
  const style = STATE_STYLE[state] || STATE_STYLE.STABLE;
  const resolution = decision?.level
    ? `${decision.level.w}×${decision.level.h}`
    : '—';
  const mbps =
    bitrateMbps != null
      ? bitrateMbps.toFixed(1)
      : decision?.bitrate
        ? (decision.bitrate / 1e6).toFixed(1)
        : '—';

  return (
    <div className="indicator" style={{ background: style.color }}>
      <span className="dot" />
      <span>
        {style.label} · {resolution} · {mbps} Мбит/с
      </span>
    </div>
  );
}
