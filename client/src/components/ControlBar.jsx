export default function ControlBar({
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onHangup,
}) {
  return (
    <div className="control-bar">
      <button
        type="button"
        className={`ctrl ${micOn ? '' : 'off'}`}
        onClick={onToggleMic}
        title="Микрофон"
      >
        {micOn ? 'Микрофон' : 'Микрофон ✕'}
      </button>
      <button
        type="button"
        className={`ctrl ${camOn ? '' : 'off'}`}
        onClick={onToggleCam}
        title="Камера"
      >
        {camOn ? 'Камера' : 'Камера ✕'}
      </button>
      <button
        type="button"
        className="ctrl hangup"
        onClick={onHangup}
        title="Завершить звонок"
      >
        Завершить
      </button>
    </div>
  );
}
