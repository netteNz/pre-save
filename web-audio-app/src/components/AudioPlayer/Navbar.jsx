import React from 'react';
// import { Disclosure } from '@headlessui/react';
// import { Menu } from 'lucide-react';

const Navbar = () => {
  return (
    <nav 
      className="w-full p-4 bg-opacity-100 bg-gray-900 shadow-md fixed top-0 left-0 z-10"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img 
            src="./audio-equalizer-device.svg" 
            alt="Audio Equalizer" 
            className="w-6 h-6"
          />
          <span className="text-xl font-bold text-white">Web Audio Player</span>
        </div>
        
        <div className="hidden md:flex space-x-6">
          <a href="https://nettenz.github.io" className="text-white hover:text-cyan-400 transition-colors">Home</a>
          <a href="https://nettenz.github.io/#projects" className="text-white hover:text-cyan-400 transition-colors">Projects</a>
          <a href="https://nettenz.github.io/#contact" className="text-white hover:text-cyan-400 transition-colors">Contact</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;