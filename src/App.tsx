import './App.css';
import Referee from './components/Referee/Referee';
import CustomCursor from './components/CustomCursor/CustomCursor';

function App() {
  return (
    <>
      {/* Custom Cursor with Arm */}
      <CustomCursor 
        normalCursor="/cursors/normal.png"
        hoverCursor="/cursors/hover.png"
        grabbingCursor="/cursors/grabbing.png"
        armColor="#FFD1A3" // Skin tone - CHANGE THIS to match your cursor color!
        // Other color examples:
        // armColor="#8B4513" - Brown
        // armColor="#FFC0CB" - Pink
        // armColor="#4A4A4A" - Gray (robot arm)
        // armColor="#00FF00" - Green (alien arm)
      />
      
      {/* Your game */}
      <Referee />
    </>
  );
}

export default App;