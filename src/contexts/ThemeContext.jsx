
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
    default: {
        id: 'default',
        name: 'Cyberpunk Default',
        colors: {
            primary: 'cyan',
            secondary: 'indigo',
            accent: 'emerald',
            background: 'from-slate-900 to-black',
            panel: 'bg-[#02040a]',
            text: 'text-cyan-400',
            border: 'border-cyan-500/30'
        },
        overlay: null
    },
    winter: {
        id: 'winter',
        name: 'Winter Frost',
        colors: {
            primary: 'sky',
            secondary: 'blue',
            accent: 'white',
            background: 'from-slate-900 to-slate-800',
            panel: 'bg-[#0f172a]',
            text: 'text-sky-400',
            border: 'border-sky-500/30'
        },
        overlay: 'snow'
    },
    spooky: {
        id: 'spooky',
        name: 'Spooky Hollow',
        colors: {
            primary: 'orange',
            secondary: 'purple',
            accent: 'lime',
            background: 'from-slate-950 to-black',
            panel: 'bg-[#1a0505]',
            text: 'text-orange-400',
            border: 'border-orange-500/30'
        },
        overlay: 'fog'
    }
};

export const ThemeProvider = ({ children }) => {
    // Load persisted theme or default
    const [currentThemeId, setCurrentThemeId] = useState(() => {
        return localStorage.getItem('app_theme') || 'default';
    });

    const [currentTheme, setCurrentTheme] = useState(themes[currentThemeId] || themes.default);

    useEffect(() => {
        // Update theme object when ID changes
        setCurrentTheme(themes[currentThemeId] || themes.default);
        localStorage.setItem('app_theme', currentThemeId);

        // Update document body for global overlays if needed
        document.body.className = `theme-${currentThemeId}`;

    }, [currentThemeId]);

    const setTheme = (themeId) => {
        if (themes[themeId]) {
            setCurrentThemeId(themeId);
        }
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
