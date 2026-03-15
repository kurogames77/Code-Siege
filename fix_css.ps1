$cssContent = @"
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'GamePaused';
  src: url('./assets/Game Paused DEMO.otf') format('opentype');
}

@font-face {
  font-family: 'Galsb';
  src: url('./assets/GALSB.ttf') format('truetype');
}

@layer base {
  html {
    font-size: 13px;
  }

  body {
    @apply bg-slate-950 text-slate-50 antialiased;
    font-family: 'Inter', sans-serif;
    margin: 0;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }
}

@layer utilities {
  .vertical-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
}

@layer components {
  .glass-panel {
    @apply bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl;
  }

  .game-text-stroke {
    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .animate-shimmer {
    background: linear-gradient(90deg,
        rgba(34, 211, 238, 0.3) 25%,
        rgba(255, 255, 255, 0.8) 50%,
        rgba(34, 211, 238, 0.3) 75%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite linear;
  }

  @keyframes glow-pulse {
    0%, 100% { filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.6)); }
    50% { filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.9)); }
  }

  .glow-path {
    animation: glow-pulse 3s infinite ease-in-out;
  }

  .nav-item-zoom {
    @apply transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    transition: background 0.2s ease;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(34, 211, 238, 0.4);
  }

  @keyframes scan {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }

  .animate-scan {
    animation: scan 3s linear infinite;
  }
}
"@
Set-Content -Path 'c:\Users\User\OneDrive\Desktop\Code-Siege-Admin\src\index.css' -Value $cssContent -Encoding UTF8
