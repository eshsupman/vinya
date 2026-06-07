import { useState } from 'react';

function randomId() {
  return (
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

export default function Lobby({ onEnter }) {
  const [input, setInput] = useState('');

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1>P2P Видеозвонки</h1>
        <p className="subtitle">
          Прямое соединение между браузерами с адаптивной передачей данных
        </p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onEnter(randomId())}
        >
          Создать комнату
        </button>

        <div className="divider">
          <span>или</span>
        </div>

        <div className="join-row">
          <input
            className="text-input"
            placeholder="ID комнаты"
            value={input}
            onChange={(e) => setInput(e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && input && onEnter(input)}
          />
          <button
            type="button"
            className="btn"
            disabled={!input}
            onClick={() => onEnter(input)}
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  );
}
