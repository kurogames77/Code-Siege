import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, RefreshCw, AlertTriangle, Code2, X, ChevronDown, CheckCircle2, Terminal, Cpu, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instructorAPI, aiAPI, coursesAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import pythonIcon from '../../assets/PYTHON LOGO.png';
import csharpIcon from '../../assets/csharp-Photoroom.png';
import cppIcon from '../../assets/C++-Photoroom.png';
import javascriptIcon from '../../assets/free-javascript-3d-icon-download-in-png-blend-fbx-gltf-file-formats--html-logo-vue-angular-coding-lang-pack-logos-icons-7577991-Photoroom.png';
import mysqlIcon from '../../assets/free-mysql-9294870-7578013-Photoroom.png';
import phpIcon from '../../assets/php_emblem-Photoroom.png';

const PuzzleCourses = ({ theme }) => {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [isAddLanguageModalOpen, setIsAddLanguageModalOpen] = useState(false);
    const [newLangData, setNewLangData] = useState({ name: '', id: '', color: 'cyan' });

    const [formData, setFormData] = useState({
        mode: '',
        difficulty: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0); // Progress percentage 0-100
    const [genLogs, setGenLogs] = useState([]);
    const [courseLevels, setCourseLevels] = useState({}); // Stores levels for each course
    const [selectedLevels, setSelectedLevels] = useState([]); // Levels marked for deletion in Override

    // Edit Level State
    const [isEditLevelModalOpen, setIsEditLevelModalOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState(null);
    const [editLevelData, setEditLevelData] = useState({ name: '', description: '', exp: 0 });

    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [genLogs]);

    // Live fetching of levels when filters change
    useEffect(() => {
        const fetchCurrentLevels = async () => {
            if (!selectedCourse?.id || (!isUpdateModalOpen && !isOverrideModalOpen && !isCreateModalOpen)) return;

            try {
                const response = await coursesAPI.getLevels(
                    selectedCourse.id,
                    formData.mode,
                    formData.difficulty
                );

                setCourseLevels(prev => ({
                    ...prev,
                    [selectedCourse.id]: response
                }));
            } catch (error) {
                console.error('Failed to sync current category levels:', error);
            }
        };

        fetchCurrentLevels();
    }, [selectedCourse?.id, formData.mode, formData.difficulty, isUpdateModalOpen, isOverrideModalOpen, isCreateModalOpen]);

    const queryClient = useQueryClient();
    const toast = useToast();

    // Mapping for icons
    // Mapping for icons
    const iconMap = {
        'py': pythonIcon,
        'python': pythonIcon,
        'cs': csharpIcon,
        'csharp': csharpIcon,
        'cpp': cppIcon,
        'cplusplus': cppIcon,
        'js': javascriptIcon,
        'javascript': javascriptIcon,
        'mysql': mysqlIcon,
        'sql': mysqlIcon,
        'php': phpIcon
    };

    // Fetch Courses
    const { data: remoteCourses, isLoading } = useQuery({
        queryKey: ['instructor-courses'],
        queryFn: () => instructorAPI.getCourses(),
    });

    const courses = remoteCourses?.map(c => ({
        ...c,
        icon: iconMap[c.id] || iconMap[c.icon_type] || pythonIcon // Fallback icon logic refined
    })) || [];

    // Mutations
    const saveMutation = useMutation({
        mutationFn: (course) => instructorAPI.saveCourse(course),
        onMutate: async (newCourse) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['instructor-courses'] });

            // Snapshot the previous value
            const previousCourses = queryClient.getQueryData(['instructor-courses']);

            // Optimistically update to the new value
            queryClient.setQueryData(['instructor-courses'], (old) => {
                // If update, replace
                if (old?.find(c => c.id === newCourse.id)) {
                    return old.map(c => c.id === newCourse.id ? { ...c, ...newCourse } : c);
                }
                // If new, add
                return [...(old || []), { ...newCourse, icon_type: 'custom' }];
            });

            // Return a context object with the snapshotted value
            return { previousCourses };
        },
        onError: (err, newCourse, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            queryClient.setQueryData(['instructor-courses'], context.previousCourses);
            toast.error(`Failed to save course: ${err.message}`);
        },
        onSuccess: () => {
            // Always refetch after error or success:
            queryClient.invalidateQueries(['instructor-courses']);
            toast.success('Course saved successfully');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (courseId) => instructorAPI.deleteCourse(courseId),
        onSuccess: () => {
            queryClient.invalidateQueries(['instructor-courses']);
            toast.success('Course deleted successfully');
            handleCloseModal();
        },
        onError: (err) => toast.error(`Failed to delete course: ${err.message}`)
    });

    const handleOpenCreate = (course) => {
        setSelectedCourse(course);
        setFormData({ mode: '', difficulty: '' });
        setGenLogs([]); // Clear previous logs
        setCourseLevels(prev => ({ ...prev, [course.id]: [] })); // Clear stale levels
        setIsCreateModalOpen(true);
    };

    const handleOpenUpdate = async (course) => {
        setSelectedCourse(course);
        setFormData({
            mode: course.mode || '',
            difficulty: course.difficulty || ''
        });
        setGenLogs([]); // Clear logs
        setIsUpdateModalOpen(true);
    };

    const handleOpenOverride = async (course) => {
        setSelectedCourse(course);
        setFormData({
            mode: course.mode || '',
            difficulty: course.difficulty || ''
        });
        setSelectedLevels([]);
        setGenLogs([]); // Clear logs
        setIsOverrideModalOpen(true);
    };

    const handleOpenEditLevel = (level) => {
        setEditingLevel(level);
        setEditLevelData({
            name: level.name,
            description: level.description || '',
            exp: level.rewards?.exp || 0
        });
        setIsEditLevelModalOpen(true);
    };

    const handleEditLevelSubmit = async () => {
        if (!editingLevel) return;
        try {
            await instructorAPI.updateLevel(editingLevel.id, {
                name: editLevelData.name,
                description: editLevelData.description,
                rewards: { exp: parseInt(editLevelData.exp), coins: 0 }
            });

            // Update local state without refetching
            setCourseLevels(prev => ({
                ...prev,
                [selectedCourse.id]: prev[selectedCourse.id].map(l =>
                    l.id === editingLevel.id ? {
                        ...l,
                        name: editLevelData.name,
                        description: editLevelData.description,
                        rewards: { exp: parseInt(editLevelData.exp), coins: 0 }
                    } : l
                )
            }));

            toast.success('Level updated successfully');
            setIsEditLevelModalOpen(false);
        } catch (error) {
            console.error('Failed to update level:', error);
            toast.error('Failed to update level');
        }
    };

    const toggleLevelSelection = (levelId) => {
        setSelectedLevels(prev =>
            prev.includes(levelId)
                ? prev.filter(id => id !== levelId)
                : [...prev, levelId]
        );
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setIsUpdateModalOpen(false);
        setIsOverrideModalOpen(false);
        setIsOverrideModalOpen(false);
        setIsAddLanguageModalOpen(false);
        setIsEditLevelModalOpen(false);
        setSelectedCourse(null);
        setSelectedCourse(null);
        setNewLangData({ name: '', id: '', color: 'cyan' });
        setGenLogs([]); // Safety clear
    };

    const handleAddLanguageSubmit = (e) => {
        e.preventDefault();
        if (newLangData.name) {
            // Generate ID: 'python' -> 'py', 'javascript' -> 'js', etc. to match tower mapping
            let generatedId = newLangData.name.toLowerCase().replace(/\s+/g, '');
            if (generatedId.includes('python')) generatedId = 'py';
            else if (generatedId === 'c++') generatedId = 'cpp';
            else if (generatedId === 'c#') generatedId = 'cs';
            else if (generatedId.includes('javascript')) generatedId = 'js';
            else if (generatedId.includes('mysql') || generatedId.includes('sql')) generatedId = 'mysql';
            else if (generatedId.includes('php')) generatedId = 'php';
            else generatedId = generatedId.substring(0, 3);

            saveMutation.mutate({
                id: generatedId,
                name: newLangData.name,
                color: newLangData.color,
                icon_type: 'custom',
                difficulty: 'Beginner', // Default
                mode: 'Standard'        // Default
            }, {
                onSuccess: () => handleCloseModal()
            });
        }
    };


    const handleOverrideSubmit = (e) => {
        e.preventDefault();
        if (selectedLevels.length > 0) {
            setCourseLevels(prev => ({
                ...prev,
                [selectedCourse.id]: prev[selectedCourse.id].filter(l => !selectedLevels.includes(l.id))
            }));
        }
        console.log('Override submitted:', selectedCourse.name, formData, 'Deleted levels:', selectedLevels);
        handleCloseModal();
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setIsGenerating(true);
        setGenerationProgress(0);
        setGenLogs([]);

        const addLog = (message, type = 'info') => {
            setGenLogs(prev => [...prev, {
                id: Date.now() + Math.random(),
                time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                message,
                type
            }]);
        };

        try {
            setGenerationProgress(10);
            addLog(`Initializing AI Neural Engine for ${selectedCourse.name}...`, 'info');

            setGenerationProgress(20);
            addLog(`Analyzing Curriculum Parameters: ${formData.mode} | ${formData.difficulty}`, 'info');

            // Call Gemini API
            const response = await aiAPI.generateLevels(
                selectedCourse.name,
                formData.difficulty,
                formData.mode
            );

            setGenerationProgress(50);

            // Check if response has levels
            if (response.levels && response.levels.length > 0) {

                // FORCE SORT by ID to ensure strict 1-10 order
                // The AI might return them as 1, 10, 2... or random. We fix it here.
                response.levels.sort((a, b) => {
                    const idA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
                    const idB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
                    return idA - idB;
                });

                const totalLevels = response.levels.length;

                // Add logs for each generated level simulation
                for (let i = 0; i < totalLevels; i++) {
                    addLog(`Generated Level ${i + 1}: ${response.levels[i].name}`, 'success');
                    // Calculate progress from 50% to 90% based on levels
                    const progress = 50 + Math.floor(((i + 1) / totalLevels) * 40);
                    setGenerationProgress(progress);
                }

                // Store generated levels
                setCourseLevels(prev => ({
                    ...prev,
                    [selectedCourse.id]: response.levels
                }));

                // PERSIST LEVELS TO DB
                addLog(`Persisting neural patterns for ${formData.mode} | ${formData.difficulty}...`, 'info');
                await instructorAPI.saveLevels(
                    selectedCourse.id,
                    response.levels,
                    formData.mode,
                    formData.difficulty
                );

                setGenerationProgress(100);
                addLog('Levels successfully synchronized.', 'success');

                addLog(`Course generation completed successfully. ${response.levels.length} Levels deployed.`, 'success');
            } else {
                addLog('AI returned no levels. Please try again.', 'warning');
            }

            // Update course in DB
            // Ensure all required fields for 'upsert' are present (id, name, icon_type, color, difficulty, mode)
            saveMutation.mutate({
                id: selectedCourse.id,
                name: selectedCourse.name,
                icon_type: selectedCourse.icon_type || selectedCourse.id, // Fallback to ID if icon_type missing
                color: selectedCourse.color || 'blue',
                difficulty: formData.difficulty,
                mode: formData.mode
            });

        } catch (error) {
            console.error('Generation Failed:', error);
            console.error('Error Details:', error.details);
            addLog(`Error: ${error.message} ${error.details ? `(${error.details})` : ''}`, 'error');
            toast.error('Failed to generate levels. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        saveMutation.mutate({
            ...selectedCourse,
            difficulty: formData.difficulty,
            mode: formData.mode
        }, {
            onSuccess: () => handleCloseModal()
        });
    };

    return (
        <div className="space-y-8 pb-10 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Puzzle Courses</h2>
                    <p className={`text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        <span className="w-8 h-0.5 bg-current rounded-full" />
                        Manage Languages and Challenge Parameters
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsAddLanguageModalOpen(true)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all group ${theme === 'dark'
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]'
                            : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                            }`}
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        <span className="text-xs font-black uppercase tracking-widest">Add Language</span>
                    </button>
                    <div className={`p-3 border rounded-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                        }`}>
                        <BookOpen className="w-5 h-5 text-cyan-500" />
                    </div>
                </div>
            </div>

            {/* Course List */}
            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    // Skeleton Loading State
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`p-6 border rounded-2xl flex items-center justify-between animate-pulse ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                                <div className="space-y-2">
                                    <div className={`h-6 w-32 rounded ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                                    <div className={`h-3 w-20 rounded ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className={`h-9 w-24 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                                <div className={`h-9 w-24 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                            </div>
                        </div>
                    ))
                ) : (
                    courses.map((course, idx) => (
                        <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-6 border rounded-2xl flex items-center justify-between group transition-all duration-500 ${theme === 'dark'
                                ? 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60 hover:border-cyan-500/30'
                                : 'bg-white border-slate-200 hover:border-cyan-500 shadow-sm hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden`}>
                                    <img src={course.icon} alt={course.name} className={`object-contain ${course.id === 'py' ? 'w-14 h-14' : 'w-12 h-12'}`} />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black italic tracking-tighter transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{course.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Language</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Create Button */}
                                <button
                                    onClick={() => handleOpenCreate(course)}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg group/btn transition-all ${theme === 'dark'
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40'
                                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 hover:border-emerald-200 shadow-sm'
                                        }`}
                                >
                                    <Plus className="w-4 h-4 text-emerald-500" />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`}>Generate</span>
                                </button>

                                {/* Update Button */}
                                <button
                                    onClick={() => handleOpenUpdate(course)}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg group/btn transition-all ${theme === 'dark'
                                        ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 hover:border-cyan-500/40'
                                        : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-100 hover:border-cyan-200 shadow-sm'
                                        }`}
                                >
                                    <RefreshCw className={`w-4 h-4 group-hover/btn:rotate-180 transition-transform ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>Update</span>
                                </button>

                                {/* Override Button */}
                                <button
                                    onClick={() => handleOpenOverride(course)}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg group/btn transition-all ${theme === 'dark'
                                        ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 hover:border-rose-500/40'
                                        : 'bg-rose-50 hover:bg-rose-100 border-rose-100 hover:border-rose-200 shadow-sm'
                                        }`}
                                >
                                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-rose-500' : 'text-rose-600'}`}>Override</span>
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Create Course Modal */}
            <AnimatePresence>
                {isCreateModalOpen && selectedCourse && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 transition-colors duration-500 ${theme === 'dark' ? 'bg-black/80' : 'bg-slate-900/40'
                            }`}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className={`w-full max-w-5xl ml-96 border rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-[#0B1224] border-white/10' : 'bg-white border-slate-200'
                                }`}
                        >
                            {/* Modal Header */}
                            <div className={`p-6 border-b flex items-center justify-between transition-colors ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-white/5' : 'bg-slate-50 border-slate-200'
                                }`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                                        <img src={selectedCourse.icon} alt={selectedCourse.name} className="w-10 h-10 object-contain" />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black italic tracking-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Create {selectedCourse.name} Course</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Define Parameters</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                        }`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Left Column: Settings */}
                                    <div className="space-y-6">
                                        {/* Mode Selection */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Course Mode</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.mode}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, mode: e.target.value });
                                                        setGenLogs([]);
                                                        setCourseLevels(prev => ({ ...prev, [selectedCourse.id]: [] }));
                                                    }}
                                                    className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${theme === 'dark'
                                                        ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50 hover:bg-slate-900/80'
                                                        : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <option value="" disabled className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Select Mode</option>
                                                    <option value="Beginner" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Beginner</option>
                                                    <option value="Intermediate" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Intermediate</option>
                                                    <option value="Advance" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Advance</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Difficulty Selection */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Difficulty Level</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.difficulty}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, difficulty: e.target.value });
                                                        setGenLogs([]);
                                                        setCourseLevels(prev => ({ ...prev, [selectedCourse.id]: [] }));
                                                    }}
                                                    className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${theme === 'dark'
                                                        ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50 hover:bg-slate-900/80'
                                                        : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <option value="" disabled className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Select Difficulty</option>
                                                    <option value="Easy" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Easy</option>
                                                    <option value="Medium" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Medium</option>
                                                    <option value="Hard" className={theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Hard</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: AI Generation Terminal */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between pl-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <Terminal className="w-3 h-3" />
                                                AI Process Logs
                                            </label>
                                            {isGenerating && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
                                                    <span className="text-[8px] font-bold text-cyan-500 uppercase tracking-tighter">Processing...</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={`border rounded-xl p-4 h-64 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1.5 shadow-inner transition-colors ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200 text-slate-600'
                                            }`}>
                                            {genLogs.length === 0 ? (
                                                <div className="text-slate-600 italic flex flex-col items-center justify-center h-full gap-2">
                                                    <Cpu className="w-5 h-5 opacity-20" />
                                                    <span>Awaiting deployment instructions...</span>
                                                </div>
                                            ) : (
                                                genLogs.map((log) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -5 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        key={log.id}
                                                        className="flex gap-2 leading-relaxed"
                                                    >
                                                        <span className="text-slate-600 shrink-0">{log.time}</span>
                                                        <span className="text-slate-500 shrink-0">[{log.type.toUpperCase()}]</span>
                                                        <span className={`
                                                            ${log.type === 'success' ? 'text-emerald-400' : ''}
                                                            ${log.type === 'error' ? 'text-rose-400' : ''}
                                                            ${log.type === 'warning' ? 'text-amber-400' : ''}
                                                            ${log.type === 'info' ? 'text-cyan-400' : ''}
                                                        `}>
                                                            {log.message}
                                                        </span>
                                                    </motion.div>
                                                ))
                                            )}
                                            <div ref={scrollRef} />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-4 pt-4">
                                    {/* Progress Bar */}
                                    <AnimatePresence>
                                        {isGenerating && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-1"
                                            >
                                                <div className="flex justify-between items-end px-1">
                                                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Generating Course Content...</span>
                                                    <span className="text-[10px] font-bold text-cyan-500">{generationProgress}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-200/20 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${generationProgress}%` }}
                                                        transition={{ duration: 0.5 }}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={handleCloseModal}
                                            disabled={isGenerating}
                                            className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${isGenerating ? 'opacity-50 cursor-not-allowed' :
                                                theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {generationProgress === 100 ? 'Close' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={handleCreateSubmit}
                                            disabled={isGenerating || !formData.mode || !formData.difficulty}
                                            className={`px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all ${(isGenerating || !formData.mode || !formData.difficulty) ? 'opacity-50 cursor-not-allowed' : 'hover:from-emerald-400 hover:to-emerald-500'}`}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {(genLogs.length > 0 || (formData.mode && formData.difficulty && courseLevels[selectedCourse.id]?.length > 0)) ? 'Regenerate' : 'Generate'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Update Course Modal */}
            <AnimatePresence>
                {isUpdateModalOpen && selectedCourse && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 transition-colors duration-500 ${theme === 'dark' ? 'bg-black/80' : 'bg-slate-900/40'
                            }`}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className={`w-full max-w-3xl border rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-500 ${theme === 'dark' ? 'bg-[#0B1224] border-white/10' : 'bg-white border-slate-200'
                                }`}
                        >
                            {/* Modal Header */}
                            <div className={`p-6 border-b flex items-center justify-between shrink-0 transition-colors ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-white/5' : 'bg-slate-50 border-slate-200'
                                }`}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                                        <img src={selectedCourse.icon} alt={selectedCourse.name} className="w-10 h-10 object-contain" />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black italic tracking-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Update {selectedCourse.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Levels</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                        }`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                                {/* Two Column Layout */}
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Left Column: Mode and Difficulty */}
                                    <div className="space-y-6">
                                        {/* Mode Selection */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Course Mode</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.mode}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, mode: e.target.value });
                                                        setGenLogs([]);
                                                        setCourseLevels(prev => ({ ...prev, [selectedCourse.id]: [] }));
                                                    }}
                                                    className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${theme === 'dark'
                                                        ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50 hover:bg-slate-900/80'
                                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <option value="" disabled className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Select Mode</option>
                                                    <option value="Beginner" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Beginner</option>
                                                    <option value="Intermediate" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Intermediate</option>
                                                    <option value="Advance" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Advance</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Difficulty Selection */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Difficulty Level</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.difficulty}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, difficulty: e.target.value });
                                                        setGenLogs([]);
                                                        setCourseLevels(prev => ({ ...prev, [selectedCourse.id]: [] }));
                                                    }}
                                                    className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${theme === 'dark'
                                                        ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50 hover:bg-slate-900/80'
                                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <option value="" disabled className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Select Difficulty</option>
                                                    <option value="Easy" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Easy</option>
                                                    <option value="Medium" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Medium</option>
                                                    <option value="Hard" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Hard</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Levels List */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                                            Active Levels
                                        </label>
                                        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {(!courseLevels[selectedCourse.id] || courseLevels[selectedCourse.id].length === 0) ? (
                                                <div className={`py-12 flex flex-col items-center justify-center gap-3 border border-dashed rounded-2xl transition-colors ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
                                                    }`}>
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                                                        }`}>
                                                        <BookOpen className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                                    </div>
                                                    <p className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>No levels generated yet</p>
                                                    <p className={`text-[10px] font-medium ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>Use "Generate" to create levels first</p>
                                                </div>
                                            ) : (
                                                courseLevels[selectedCourse.id].map((level, lIdx) => (
                                                    <div
                                                        key={level.id}
                                                        onClick={() => handleOpenEditLevel(level)}
                                                        className={`flex items-center justify-between p-4 border rounded-2xl transition-all group/level cursor-pointer ${theme === 'dark'
                                                            ? 'bg-slate-900/50 border-white/5 hover:border-cyan-500/30'
                                                            : 'bg-slate-50 border-slate-200 hover:border-cyan-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                                                                {level.level_order || (lIdx + 1)}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <h4 className={`text-xs font-black uppercase tracking-tight transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{level.name}</h4>
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                                    {level.rewards?.exp || 0} XP
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={`p-2 rounded-lg transition-colors group-hover/level:bg-cyan-500 group-hover/level:text-white ${theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400'}`}>
                                                            <Edit2 className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleCloseModal}
                                        className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                            }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateSubmit}
                                        disabled={!formData.mode || !formData.difficulty}
                                        className={`px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all ${(!formData.mode || !formData.difficulty) ? 'opacity-50 cursor-not-allowed' : 'hover:from-cyan-400 hover:to-blue-500'}`}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Override Course Modal */}
            <AnimatePresence>
                {isOverrideModalOpen && selectedCourse && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 transition-colors duration-500 ${theme === 'dark' ? 'bg-black/80' : 'bg-slate-900/40'
                            }`}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className={`w-full max-w-3xl border rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-500 ${theme === 'dark' ? 'bg-[#0B1224] border-white/10' : 'bg-white border-slate-200'
                                }`}
                        >
                            {/* Modal Header */}
                            <div className={`p-6 border-b flex items-center justify-between shrink-0 transition-colors ${theme === 'dark' ? 'bg-gradient-to-r from-rose-500/20 to-transparent border-white/5' : 'bg-rose-50 border-rose-200'
                                }`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border transition-colors ${theme === 'dark' ? 'bg-rose-500/20 border-rose-500/30' : 'bg-white border-rose-200 shadow-sm'
                                        }`}>
                                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black italic tracking-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>System Override: {selectedCourse.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Advanced Curriculum Maintenance</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-rose-100 text-rose-400 hover:text-rose-600'
                                        }`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Left Column: Mode and Difficulty */}
                                    <div className="space-y-6">
                                        {/* Mode Selection */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Course Mode</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.mode}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, mode: e.target.value });
                                                        setCourseLevels(prev => ({ ...prev, [selectedCourse.id]: [] }));
                                                    }}
                                                    className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${theme === 'dark'
                                                        ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50 hover:bg-slate-900/80'
                                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <option value="" disabled className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Select Mode</option>
                                                    <option value="Beginner" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Beginner</option>
                                                    <option value="Intermediate" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Intermediate</option>
                                                    <option value="Advance" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Advance</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Difficulty Selection */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Difficulty Level</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.difficulty}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, difficulty: e.target.value });
                                                        setCourseLevels(prev => ({ ...prev, [selectedCourse.id]: [] }));
                                                    }}
                                                    className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer ${theme === 'dark'
                                                        ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50 hover:bg-slate-900/80'
                                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <option value="" disabled className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Select Difficulty</option>
                                                    <option value="Easy" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Easy</option>
                                                    <option value="Medium" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Medium</option>
                                                    <option value="Hard" className={theme === 'dark' ? 'bg-slate-900' : 'bg-white'}>Hard</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Levels List */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                Active Levels ({courseLevels[selectedCourse.id]?.length || 0})
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-2">
                                            {courseLevels[selectedCourse.id]?.length === 0 ? (
                                                <div className={`py-12 flex flex-col items-center justify-center gap-3 border border-dashed rounded-2xl transition-colors ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
                                                    }`}>
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                                                        }`}>
                                                        <BookOpen className={`w-6 h-6 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                                                    </div>
                                                    <p className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>No levels found in database</p>
                                                </div>
                                            ) : (
                                                courseLevels[selectedCourse.id]?.map((level) => {
                                                    const isSelected = selectedLevels.includes(level.id);
                                                    return (
                                                        <motion.div
                                                            layout
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            key={level.id}
                                                            onClick={() => toggleLevelSelection(level.id)}
                                                            className={`flex items-center justify-between p-4 border rounded-2xl transition-all cursor-pointer group/level ${isSelected
                                                                ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                                                                : theme === 'dark'
                                                                    ? 'bg-slate-900/50 border-white/5 hover:border-white/20'
                                                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors ${isSelected
                                                                    ? 'bg-rose-500 text-white'
                                                                    : theme === 'dark' ? 'bg-slate-800 text-slate-400 group-hover/level:text-white' : 'bg-slate-200 text-slate-500 group-hover/level:text-slate-800'
                                                                    }`}>
                                                                    {level.id}
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <span className={`text-sm font-bold block transition-colors ${isSelected ? 'text-rose-500' : theme === 'dark' ? 'text-slate-200' : 'text-slate-900'
                                                                        }`}>
                                                                        {level.name}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                                        <span className={`text-[9px] font-black uppercase tracking-tight ${isSelected ? 'text-rose-500/70' : 'text-slate-500'}`}>
                                                                            {isSelected ? 'MARKED FOR DELETION' : 'Verified & Active'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                                                                    <X className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleCloseModal}
                                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                            }`}
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={handleOverrideSubmit}
                                        disabled={!formData.mode || !formData.difficulty}
                                        className={`px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-all ${(!formData.mode || !formData.difficulty) ? 'opacity-50 cursor-not-allowed' : 'hover:from-rose-400 hover:to-rose-500'}`}
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                        Delete Selected
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Edit Level Modal */}
            <AnimatePresence>
                {isEditLevelModalOpen && editingLevel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-4 transition-colors duration-500 ${theme === 'dark' ? 'bg-black/80' : 'bg-slate-900/40'}`}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className={`w-full max-w-lg border rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-[#0B1224] border-white/10' : 'bg-white border-slate-200'}`}
                        >
                            <div className={`p-6 border-b flex items-center justify-between transition-colors ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${theme === 'dark' ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-500' : 'bg-white border-cyan-200 text-cyan-600'}`}>
                                        <Edit2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black italic tracking-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{editingLevel.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Level Details</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsEditLevelModalOpen(false)}>
                                    <X className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Level Name</label>
                                        <input
                                            type="text"
                                            value={editLevelData.name}
                                            onChange={(e) => setEditLevelData({ ...editLevelData, name: e.target.value })}
                                            className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50' : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Description</label>
                                        <textarea
                                            value={editLevelData.description}
                                            onChange={(e) => setEditLevelData({ ...editLevelData, description: e.target.value })}
                                            className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all h-24 resize-none ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50' : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">EXP Reward</label>
                                            <input
                                                type="number"
                                                value={editLevelData.exp}
                                                onChange={(e) => setEditLevelData({ ...editLevelData, exp: e.target.value })}
                                                className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50' : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 grid grid-cols-2 gap-4">
                                    <button onClick={() => setIsEditLevelModalOpen(false)} className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Cancel</button>
                                    <button onClick={handleEditLevelSubmit} className={`px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all hover:from-cyan-400 hover:to-cyan-500`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Save Updates
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Language Modal */}
            <AnimatePresence>
                {isAddLanguageModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 transition-colors duration-500 ${theme === 'dark' ? 'bg-black/80' : 'bg-slate-900/40'}`}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className={`w-full max-w-lg border rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-[#0B1224] border-white/10' : 'bg-white border-slate-200'}`}
                        >
                            <div className={`p-6 border-b flex items-center justify-between transition-colors ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${theme === 'dark' ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-500' : 'bg-white border-cyan-200 text-cyan-600'}`}>
                                        <Code2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black italic tracking-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Add New Language</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expand Curriculum</p>
                                    </div>
                                </div>
                                <button onClick={handleCloseModal}>
                                    <X className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Language Name</label>
                                        <input
                                            type="text"
                                            value={newLangData.name}
                                            onChange={(e) => setNewLangData({ ...newLangData, name: e.target.value })}
                                            placeholder="e.g. Ruby"
                                            className={`w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white focus:border-cyan-500/50' : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 grid grid-cols-2 gap-4">
                                    <button onClick={handleCloseModal} className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Cancel</button>
                                    <button onClick={handleAddLanguageSubmit} disabled={!newLangData.name} className={`px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all ${(!newLangData.name) ? 'opacity-50 cursor-not-allowed' : 'hover:from-cyan-400 hover:to-cyan-500'}`}>
                                        <Plus className="w-4 h-4" />
                                        Add Language
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default PuzzleCourses;
