import { useState } from 'react';
import './App.css';
import Referee from './components/Referee/Referee';
import CustomCursor from './components/CustomCursor/CustomCursor';
import HandGestureDetector from './components/HandGestureDetector/HandGestureDetector';

function App() {
  const [showHandVideo, setShowHandVideo] = useState(false);
  const [isFightingGameOpen, setIsFightingGameOpen] = useState(false);

  const handlePrayingDetected = () => {
    console.log("😭🙏 its working chat");
    // Dispatch custom event to Referee
    window.dispatchEvent(new CustomEvent('prayingDetected'));
  };

  return (
    <>
      {/* Hand Gesture Detector - Top Level */}
      <HandGestureDetector 
        onPrayingDetected={handlePrayingDetected}
        isActive={!isFightingGameOpen}
        showVideo={showHandVideo}
      />

      {/* Debug Toggle Button */}
      <button 
        onClick={() => setShowHandVideo(!showHandVideo)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          padding: '10px 20px',
          background: '#202020',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 10002,
          fontSize: '14px'
        }}
      >
        {showHandVideo ? '                 ' : '                 '}
      </button>

      {/* Custom Cursor with Arm */}
      <CustomCursor 
        normalCursor="/cursors/normal.png"
        hoverCursor="/cursors/hover.png"
        grabbingCursor="/cursors/grabbing.png"
      />
      
      {/* Your game */}
      <Referee onFightingGameStateChange={setIsFightingGameOpen} />
    </>
  );
}

export default App;