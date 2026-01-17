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
      />
      
      {/* Your game */}
      <Referee />
    </>
  );
}

export default App;