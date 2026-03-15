import React, { useEffect, useState, useRef } from 'react';

const SingleTabEnforcer = ({ children }) => {
    const [isDuplicateTab, setIsDuplicateTab] = useState(false);
    const channelRef = useRef(null);
    const isOriginalTab = useRef(false);

    useEffect(() => {
        // Create the channel
        const channel = new BroadcastChannel('code_siege_tabs');
        channelRef.current = channel;

        // Listen for messages from other tabs
        channel.onmessage = (event) => {
            if (event.data === 'ping') {
                // If we receive a ping, we must be the original tab (we were here first)
                isOriginalTab.current = true;
                // Tell the new tab that we are already here
                channel.postMessage('pong');
            } else if (event.data === 'pong') {
                // If we receive a pong after pinging, another tab is already open
                setIsDuplicateTab(true);
            }
        };

        // When this tab first loads, send a ping to see if any other tabs are open
        channel.postMessage('ping');

        // We assume we are the original until proven otherwise (a pong is received)
        // Set a small timeout so the pong has time to arrive before we render
        const timeout = setTimeout(() => {
            if (!isDuplicateTab && !isOriginalTab.current) {
               isOriginalTab.current = true;
            }
        }, 500);

        return () => {
            clearTimeout(timeout);
            channel.close();
        };
    }, [isDuplicateTab]);

    if (isDuplicateTab) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center font-galsb relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-500/10 blur-[120px] rounded-full pointer-events-none" />
                </div>
                
                <div className="relative z-10 max-w-xl bg-black/40 border-2 border-rose-500/30 rounded-2xl p-8 backdrop-blur-md shadow-2xl shadow-rose-900/20">
                    <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    
                    <h1 className="text-3xl font-black text-white tracking-wider mb-4 uppercase">Multiple Tabs Detected</h1>
                    
                    <div className="space-y-4 text-slate-300">
                        <p className="text-lg">
                            You cannot use <span className="text-rose-400 font-bold">Code Siege</span> in more than one tab at the same time.
                        </p>
                        <p className="text-sm bg-white/5 p-4 rounded-xl border border-white/10">
                            This restriction ensures your progress, rewards, and connection to the game server remain stable and in sync.
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => window.close()}
                        className="mt-8 px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors w-full tracking-widest text-sm"
                    >
                        CLOSE THIS TAB
                    </button>
                    <p className="mt-4 text-xs text-slate-500">
                        Please return to your original active tab to continue playing.
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

export default SingleTabEnforcer;
