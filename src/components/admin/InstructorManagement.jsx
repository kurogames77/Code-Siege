import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, MoreVertical, FileText, Mail, User, Calendar, Ban, Edit2, Shield, Trash2, Info, BookOpen, Layers, X, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { instructorAPI } from '../../services/api';

const InstructorManagement = ({ theme = 'dark' }) => {
    // Mock Data for Applications
    const [applications, setApplications] = useState([]);

    // Live Data for Users
    const [instructors, setInstructors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Courses data (towers & languages)
    const [courses, setCourses] = useState([]);
    
    const [instructorSearch, setInstructorSearch] = useState('');

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingInstructor, setEditingInstructor] = useState(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // Fetch applications
            const appsResponse = await instructorAPI.getApplications();
            if (appsResponse.applications) {
                setApplications(appsResponse.applications);
            }

            // Fetch courses (towers & languages)
            try {
                const coursesData = await instructorAPI.getCourses();
                setCourses(coursesData || []);
            } catch (err) {
                console.error('Failed to fetch courses:', err);
            }

            // Fetch users (instructors & students) - assuming we fetch a big chunk or all
            const response = await instructorAPI.getUsers(1, 1000);
            if (response.users) {
                const filteredInstructors = response.users
                    .filter(u => u.role === 'instructor' || u.role === 'admin')
                    .map(u => ({
                        id: u.id,
                        name: u.username,
                        email: u.email,
                        instructorId: u.student_id || 'N/A',
                        status: u.is_banned ? 'inactive' : 'active',
                        avatar: u.avatar_url
                    }));
                setInstructors(filteredInstructors);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeactivateUser = async (id, currentStatus, type) => {
        const isBanned = currentStatus === 'active';
        const action = isBanned ? 'deactivate' : 'reactivate';

        if (window.confirm(`Are you sure you want to ${action} this ${type} account?`)) {
            try {
                await instructorAPI.banUser(id, isBanned);
                fetchUsers(); // Refresh list
            } catch (error) {
                console.error('Failed to update ban status:', error);
                alert('Failed to update account status');
            }
        }
    };

    const handleDeleteUser = async (id, type) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY delete this ${type} account? This cannot be undone.`)) {
            try {
                await instructorAPI.deleteUser(id);
                fetchUsers(); // Refresh list
            } catch (error) {
                console.error('Failed to delete user:', error);
                alert(`Failed to delete ${type} account`);
            }
        }
    };

    // --- Application Actions ---
    const handleApprove = async (app) => {
        try {
            await instructorAPI.approveApplication(app.id);
            fetchUsers();
        } catch (error) {
            console.error('Failed to approve application', error);
        }
    };
    
    const handleReject = async (id) => {
        if(window.confirm('Are you sure you want to reject this application?')) {
            try {
                await instructorAPI.rejectApplication(id, 'Rejected by admin');
                fetchUsers();
            } catch (error) {
                console.error('Failed to reject application', error);
            }
        }
    };

    // --- Instructor Handlers ---
    const handleUpdateInstructor = (instructor) => {
        setEditingInstructor(instructor);
        setIsEditModalOpen(true);
    };

    const handleSaveInstructorUpdate = async (e) => {
        e.preventDefault();
        try {
            await instructorAPI.updateUser(editingInstructor.id, {
                username: editingInstructor.name,
                student_id: editingInstructor.instructorId
            });
            setIsEditModalOpen(false);
            fetchUsers(); 
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Failed to update instructor details');
        }
    };

    // Get courses handled by a specific instructor
    const getInstructorCourses = (instructorId) => {
        return courses.filter(c => c.instructor_id === instructorId);
    };

    const filteredInstructors = instructors.filter(i =>
        i.name.toLowerCase().includes(instructorSearch.toLowerCase()) ||
        i.email.toLowerCase().includes(instructorSearch.toLowerCase()) ||
        i.instructorId.toLowerCase().includes(instructorSearch.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return theme === 'dark' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-cyan-600 bg-cyan-50 border-cyan-200';
            case 'inactive': return theme === 'dark' ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' : 'text-slate-500 bg-slate-50 border-slate-200';
            default: return theme === 'dark' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-600 bg-amber-50 border-amber-200';
        }
    };

    const scrollbarStyles = `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.5); }
    `;

    // Color map for course badges
    const courseColorMap = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        red: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    };

    return (
        <div className="flex flex-col h-full gap-8 overflow-y-auto overflow-x-hidden custom-scrollbar pb-10 pr-2">
            <style>{scrollbarStyles}</style>
            
            {/* TOP ROW: Instructors */}
            <div className={`flex flex-col h-[500px] border rounded-2xl p-6 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0B1224] border-cyan-500/20' : 'bg-white border-slate-200'}`}>
                <div className="mb-6 flex-none">
                    <h2 className={`text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 mb-4 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Instructor <span className="text-cyan-500">Management</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full not-italic tracking-normal transition-colors duration-500 ${theme === 'dark' ? 'text-slate-500 bg-slate-800' : 'text-slate-400 bg-slate-100'}`}>{instructors.filter(i => i.status === 'active').length} Active</span>
                    </h2>
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search instructors..."
                            value={instructorSearch}
                            onChange={(e) => setInstructorSearch(e.target.value)}
                            className={`w-full border rounded-lg pl-9 pr-4 py-3 text-sm focus:border-cyan-500/50 outline-none transition-all duration-500 ${theme === 'dark' ? 'bg-slate-950/50 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    <AnimatePresence mode="popLayout">
                        {filteredInstructors.map((instructor) => (
                            <motion.div
                                key={instructor.id}
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`p-4 rounded-xl border transition-all duration-500 group ${instructor.status === 'active'
                                    ? (theme === 'dark' ? 'bg-[#0B1224]/60 border-white/5 hover:border-cyan-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-cyan-500/50')
                                    : 'opacity-60 grayscale bg-slate-100/10 border-transparent'
                                    }`}
                            >
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border overflow-hidden ${getStatusColor(instructor.status)}`}>
                                                {instructor.avatar ? (
                                                    <img src={instructor.avatar} alt={instructor.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-base flex items-center gap-2 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                    {instructor.name}
                                                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded border ${getStatusColor(instructor.status)}`}>{instructor.status}</span>
                                                </h3>
                                                <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1 font-medium">
                                                    <span className="flex items-center gap-1.5 truncate max-w-[120px]" title={instructor.email}><Mail className="w-3 h-3 text-slate-500" /> {instructor.email}</span>
                                                    <span className="flex items-center gap-1.5 shrink-0"><Shield className="w-3 h-3 text-slate-500" /> {instructor.instructorId}</span>
                                                </div>
                                                {/* Tower/Language badges */}
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {getInstructorCourses(instructor.id).map(course => (
                                                        <span
                                                            key={course.id}
                                                            className={`text-[9px] uppercase px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${courseColorMap[course.color] || courseColorMap.cyan}`}
                                                        >
                                                            <Code2 className="w-2.5 h-2.5" />
                                                            {course.id} → {course.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Management Actions */}
                                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleUpdateInstructor(instructor)}
                                                className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors"
                                                title="Edit Account"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeactivateUser(instructor.id, instructor.status, 'instructor')}
                                                className={`p-2 rounded-lg border transition-colors ${instructor.status === 'active'
                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white'
                                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                                    }`}
                                                title={instructor.status === 'active' ? "Disable Account" : "Enable Account"}
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(instructor.id, 'instructor')}
                                                className="p-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors"
                                                title="Delete Account"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* INSTRUCTOR Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && editingInstructor && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsEditModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className={`relative w-full max-w-lg rounded-[2rem] border p-8 shadow-2xl ${theme === 'dark' ? 'bg-[#0B1224] border-white/10' : 'bg-white border-slate-200'}`}
                        >
                            <h2 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">Edit <span className="text-cyan-500">Instructor</span></h2>
                            <form onSubmit={handleSaveInstructorUpdate} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={editingInstructor.name}
                                        onChange={(e) => setEditingInstructor({ ...editingInstructor, name: e.target.value })}
                                        className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-cyan-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-950/50 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Instructor ID</label>
                                        <input
                                            type="text"
                                            value={editingInstructor.instructorId}
                                            onChange={(e) => setEditingInstructor({ ...editingInstructor, instructorId: e.target.value })}
                                            className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-cyan-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-950/50 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Status</label>
                                        <div className={`w-full border rounded-xl px-4 py-3 text-sm ${theme === 'dark' ? 'bg-slate-950/50 border-white/5 text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-600'} font-bold uppercase`}>
                                            {editingInstructor.status || 'active'}
                                        </div>
                                    </div>
                                </div>
                                {/* Tower → Language Pairs (Read-only from courses table) */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Towers & Languages Handled</label>
                                    <div className={`w-full border rounded-xl p-3 ${theme === 'dark' ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        {(() => {
                                            const instructorCourses = getInstructorCourses(editingInstructor.id);
                                            if (instructorCourses.length === 0) {
                                                return (
                                                    <p className="text-xs text-slate-500 italic text-center py-2">No towers assigned to this instructor</p>
                                                );
                                            }
                                            return (
                                                <div className="space-y-2">
                                                    {instructorCourses.map(course => (
                                                        <div
                                                            key={course.id}
                                                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200'}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${courseColorMap[course.color] || courseColorMap.cyan}`}>
                                                                <Code2 className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                                        {course.id}
                                                                    </span>
                                                                    <span className="text-cyan-500 text-xs font-black">→</span>
                                                                    <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                                        {course.name}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[9px] uppercase px-2 py-0.5 rounded-md border font-bold ${courseColorMap[course.color] || courseColorMap.cyan}`}>
                                                                {course.color || 'default'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <p className={`text-[10px] mt-1.5 ml-1 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                                        Tower assignments are managed from the Courses section
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button" onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-3 rounded-xl border border-white/5 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-slate-400"
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 rounded-xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                    >Save Changes</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InstructorManagement;
