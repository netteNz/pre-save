import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import AudioPlayer from './components/AudioPlayer/AudioPlayer';
import Navbar from './components/AudioPlayer/Navbar';
import { initGA, pageView } from './utils/analytics';
import './index.css';

// Analytics wrapper component
const App = () => {
  useEffect(() => {
    initGA(); // Initialize Google Analytics
    // Track page view when the app loads
    pageView('Web Audio Player');
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar />
      {/* Add pt-20 (padding-top) to account for the fixed navbar */}
      <main className="flex-grow flex items-center justify-center pt-20 p-4">
        <AudioPlayer />
      </main>
      
      {/* Footer */}
      <footer 
        className="w-full p-4 bg-opacity-50 bg-gray-900 text-center text-sm text-gray-400 mt-auto"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <p>&copy; 2025 Emanuel Lugo. All rights reserved.</p>
      </footer>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
