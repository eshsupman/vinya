import { useEffect, useState } from 'react';
import Lobby from './components/Lobby.jsx';
import CallRoom from './components/CallRoom.jsx';

function parseRoom() {
  const match = window.location.hash.match(/^#\/room\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function App() {
  const [roomId, setRoomId] = useState(parseRoom());

  useEffect(() => {
    const onHashChange = () => setRoomId(parseRoom());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const enterRoom = (id) => {
    window.location.hash = `#/room/${id}`;
    setRoomId(id);
  };

  const leaveRoom = () => {
    window.location.hash = '';
    setRoomId(null);
  };

  return roomId ? (
    <CallRoom roomId={roomId} onLeave={leaveRoom} />
  ) : (
    <Lobby onEnter={enterRoom} />
  );
}
