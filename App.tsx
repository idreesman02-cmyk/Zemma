import React, { useState, useEffect } from 'react';
import { Lobby } from './pages/Lobby';
import { MeetingRoom } from './pages/MeetingRoom';
import { PreJoinTest } from './components/PreJoinTest';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    const path = window.location.pathname.split('/');
    if (path[1] === 'room' && path[2]) {
      setRoomId(path[2]);
    }
  }, []);

  const handleStartJoin = (id: string, userName: string, meetPasscode: string) => {
    setRoomId(id);
    setName(userName);
    setPasscode(meetPasscode);
    setShowDiagnostic(true);
  };

  const handleDiagnosticComplete = () => {
    setShowDiagnostic(false);
    if (roomId) {
      window.history.pushState({}, '', `/room/${roomId}`);
    }
  };

  if (roomId && name) {
    if (showDiagnostic) {
      return (
        <PreJoinTest 
          onComplete={handleDiagnosticComplete} 
          onCancel={() => setShowDiagnostic(false)} 
        />
      );
    }
    return <MeetingRoom roomId={roomId} name={name} initialPasscode={passcode} />;
  }

  return <Lobby onJoin={handleStartJoin} initialRoomId={roomId || undefined} />;
}
