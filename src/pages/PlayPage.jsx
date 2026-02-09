import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GameNavbar from '../components/game/GameNavbar';
import { useUser } from '../contexts/UserContext';
import { coursesAPI } from '../services/api';
import TowerNode from '../components/game/TowerNode';
import MapPaths from '../components/game/MapPaths';
import WelcomeModal from '../components/game/WelcomeModal';

// Import tower assets
import tower11 from '../assets/tower11.png';
import tower22 from '../assets/tower22.png';
import tower33 from '../assets/tower33.png';
import tower44 from '../assets/tower44.png';
import tower55 from '../assets/tower55.png';
import tower66 from '../assets/tower66.png';
import mapBG from '../assets/gamemapbg.png';
import mapBG2 from '../assets/gamemap2.png';


const PlayPage = () => {
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const location = useLocation();

    const { user: contextUser } = useUser();

    // Provide stable fallback to prevent crash and infinite loops while navigating away during logout
    const defaultUser = useMemo(() => ({ towerProgress: {} }), []);
    const user = contextUser || defaultUser;

    // Dragging state
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLobbyOpen, setIsLobbyOpen] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    // Course availability state
    const [courseStats, setCourseStats] = useState({});

    // Fetch course stats on mount to check level availability
    useEffect(() => {
        const fetchLevelCounts = async () => {
            try {
                const courses = await coursesAPI.getCourses();
                // Create a map of course ID -> level count
                const stats = {};
                courses.forEach(c => {
                    stats[c.id] = c.total_levels || 0;
                });
                setCourseStats(stats);
            } catch (error) {
                console.error("Failed to fetch course stats:", error);
            }
        };
        fetchLevelCounts();
    }, []);

    // Course Mapping (Tower ID -> Course ID)
    const towerCourseMap = useMemo(() => ({
        1: 'py',    // Eldoria -> Python
        2: 'cs',    // Tydorin -> C#
        3: 'cpp',   // Shadow Keep -> C++
        4: 'js',    // Prytody -> JavaScript
        5: 'mysql', // Abyss -> MySQL (This seems to be the intended map based on seed, Abyss is usually Database/Server)
        6: 'php'    // Aeterd -> PHP
    }), []);

    // Tower data matching the request
    const towers = useMemo(() => {
        const isTowerAvailable = (id) => {
            const courseId = towerCourseMap[id];
            // If stats loaded, check count
            if (Object.keys(courseStats).length > 0) {
                return (courseStats[courseId] || 0) > 0;
            }
            return true; // Optimistic default
        };

        return [
            { id: 1, name: 'Tower of Eldoria', current: user.towerProgress?.['1'] || 0, total: 30, image: tower11, isLocked: false, isAvailable: isTowerAvailable(1), pos: { x: 37, y: 74 } },
            { id: 2, name: 'Tower of Tydorin', current: user.towerProgress?.['2'] || 0, total: 30, image: tower22, isLocked: (user.towerProgress?.['1'] || 0) < 30, isAvailable: isTowerAvailable(2), pos: { x: 52, y: 56 } },
            { id: 3, name: 'Shadow Keep', current: user.towerProgress?.['3'] || 0, total: 39, image: tower33, isLocked: (user.towerProgress?.['2'] || 0) < 30, isAvailable: isTowerAvailable(3), pos: { x: 53, y: 23 }, infoAbove: true },
            { id: 4, name: 'Tower of Prytody', current: user.towerProgress?.['4'] || 0, total: 30, image: tower44, isLocked: (user.towerProgress?.['3'] || 0) < 39, isAvailable: isTowerAvailable(4), pos: { x: 66, y: 30 }, infoAbove: false },
            { id: 5, name: 'Tower of Abyss', current: user.towerProgress?.['5'] || 0, total: 30, image: tower55, isLocked: (user.towerProgress?.['4'] || 0) < 30, isAvailable: isTowerAvailable(5), pos: { x: 89, y: 47 } },
            { id: 6, name: 'Tower of Aeterd', current: user.towerProgress?.['6'] || 0, total: 30, image: tower66, isLocked: (user.towerProgress?.['5'] || 0) < 30, isAvailable: isTowerAvailable(6), pos: { x: 108, y: 60 } },
        ];
    }, [user, courseStats, towerCourseMap]);

    const handlePlay = (id) => {
        if (!isDragging) {
            if (id === 2 || id === '2') {
                navigate('/tower-tydorin');
            } else if (id === 3 || id === '3') {
                navigate('/tower-shadow');
            } else if (id === 4 || id === '4') {
                navigate('/tower-prytody');
            } else if (id === 5 || id === '5') {
                navigate('/tower-abyss');
            } else if (id === 6 || id === '6') {
                navigate('/tower-aeterd');
            } else {
                navigate(`/tower/${id}`);
            }
        }
    };

    // Drag logical handlers
    const startDragging = (e) => {
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        setIsDragging(true);
        setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
    };

    const onDragging = (e) => {
        if (!isDragging) return;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        let NewX = clientX - dragStart.x;
        let NewY = clientY - dragStart.y;

        // Constraint: Map should never move so much that we see the background.
        // The container is 0,0 to window.innerWidth, window.innerHeight.
        // The map is mapWidth x mapHeight.
        const minX = -(mapWidth - window.innerWidth);
        const maxX = 0;
        const minY = -(mapHeight - window.innerHeight);
        const maxY = 0;

        setOffset({
            x: Math.max(minX, Math.min(maxX, NewX)),
            y: Math.max(minY, Math.min(maxY, NewY))
        });
    };

    const stopDragging = () => {
        setIsDragging(false);
    };

    // Map dimensions (Expanded for two panels)
    const mapWidth = window.innerWidth * 3.6; // Doubled from 1.8
    const mapHeight = window.innerHeight * 1.8;

    // Initialize map centered on the current (unlocked) tower
    useEffect(() => {
        // Find the "current" tower - first one that is unlocked or the one with progress
        // In this specific case, it's Tower of Eldoria (index 0)
        const currentTower = towers.find(t => !t.isLocked) || towers[0];

        // Calculate tower position in pixels
        const towerX = (currentTower.pos.x / 100) * (mapWidth / 2);
        const towerY = (currentTower.pos.y / 100) * mapHeight;

        // Calculate offset to center the tower
        // Screen Center - Tower Position
        let initialX = (window.innerWidth / 2) - towerX;
        let initialY = (window.innerHeight / 2) - towerY;

        // Constraint boundaries
        const minX = -(mapWidth - window.innerWidth);
        const maxX = 0;
        const minY = -(mapHeight - window.innerHeight);
        const maxY = 0;

        // Clamp values
        initialX = Math.max(minX, Math.min(maxX, initialX));
        initialY = Math.max(minY, Math.min(maxY, initialY));

        setOffset({
            x: initialX,
            y: initialY
        });

        // Show Welcome Modal for new users
        if (user.level === 1 && user.xp === 0 && (!user.towerProgress || Object.keys(user.towerProgress).length === 0)) {
            setTimeout(() => {
                setShowWelcome(true);
            }, 1000);
        }
    }, [user, towers, mapWidth, mapHeight]);

    // Check for auth redirect (e.g. email confirmation)
    useEffect(() => {
        console.log("PlayPage: Checking hash", location.hash);
        if (location.hash && (location.hash.includes('access_token') || location.hash.includes('type=signup'))) {
            navigate('/verify-email');
        }
    }, [location, navigate]);

    const pathPositions = towers.map(t => ({
        // Align towers to the first map (left half)
        x: (t.pos.x / 100) * (mapWidth / 2),
        y: (t.pos.y / 100) * mapHeight
    }));

    return (
        <div className="relative w-full h-screen bg-[#0f0c29] overflow-hidden select-none">
            {/* Movable Map Canvas */}
            <div
                ref={mapRef}
                className="absolute transition-transform duration-75 ease-out"
                style={{
                    width: `${mapWidth}px`,
                    height: `${mapHeight}px`,
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    left: '0',
                    top: '0'
                }}
                onMouseDown={startDragging}
                onMouseMove={onDragging}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
                onTouchStart={startDragging}
                onTouchMove={onDragging}
                onTouchEnd={stopDragging}
            >
                {/* Background Layer: Connected Maps */}
                <div className="absolute inset-0">
                    {/* Left Map: gamemapbg.png */}
                    <div
                        className="absolute top-0 bottom-0 left-0 w-[55%] opacity-90"
                        style={{
                            backgroundImage: `url(${mapBG})`,
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
                        }}
                    />

                    {/* Right Map: gamemap2.png */}
                    <div
                        className="absolute top-0 bottom-0 right-0 w-[55%] opacity-90"
                        style={{
                            backgroundImage: `url(${mapBG2})`,
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            maskImage: 'linear-gradient(to left, black 85%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to left, black 85%, transparent 100%)'
                        }}
                    />

                    {/* Blending Overlay - Reduced intensity now that we have masks */}
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[20%] bg-gradient-to-r from-transparent via-[#0f0c29]/30 to-transparent pointer-events-none z-1" />

                    {/* Darker edges for the "map" feel */}
                    <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] pointer-events-none" />
                </div>

                {/* Path Layer */}
                <MapPaths positions={pathPositions} towers={towers} />

                {/* Towers Layer */}
                <div className="absolute inset-0 z-10">
                    {towers.map(tower => (
                        <TowerNode
                            key={tower.id}
                            tower={tower}
                            position={{
                                // Align towers to the first map (left half)
                                x: (tower.pos.x / 100) * (mapWidth / 2),
                                y: (tower.pos.y / 100) * mapHeight
                            }}
                            onPlay={handlePlay}
                            isDragging={isDragging}
                        />
                    ))}
                </div>

                {/* Atmosphere Blurs - Enhanced for depth */}
                <div className="absolute inset-0 pointer-events-none opacity-40 z-0">
                    <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-purple-600/20 blur-[180px] rounded-full" />
                    <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[200px] rounded-full" />
                    <div className="absolute top-[10%] left-[50%] w-[30%] h-[30%] bg-blue-600/15 blur-[150px] rounded-full" />
                </div>
            </div>

            {/* Fixed UI Overlays */}
            <GameNavbar
                user={user}
                toggleLobby={() => setIsLobbyOpen(true)}
            />

            {/* Welcome Modal for new users */}
            <WelcomeModal
                isOpen={showWelcome}
                onClose={() => setShowWelcome(false)}
            />

            {/* GlobalAudioControl is now global in App.js */}
        </div>
    );
};

export default PlayPage;
