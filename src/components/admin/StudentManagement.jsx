import React, { useState, useEffect } from 'react';
import { Search, User, Ban, Edit2, Trash2, Info, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { instructorAPI } from '../../services/api';

const StudentManagement = ({ theme = 'dark' }) => {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [studentSearch, setStudentSearch] = useState('');

    // Modals
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [studentModalMode, setStudentModalMode] = useState('info'); // 'info' or 'edit'

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const response = await instructorAPI.getUsers(1, 1000);
            if (response.users) {
                const filteredStudents = response.users
                    .filter(u => u.role === 'user' || u.role === 'student')
                    .map(u => ({
                        id: u.id,
                        name: u.username,
                        email: u.email,
                        studentId: u.student_id || 'N/A',
                        status: u.is_banned ? 'inactive' : 'active',
                        avatar: u.avatar_url,
                        level: u.level || 1,
                        xp: u.xp || 0
                    }));
                setStudents(filteredStudents);
            }
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleDeactivateUser = async (id, currentStatus) => {
        const isBanned = currentStatus === 'active';
        const action = isBanned ? 'deactivate' : 'reactivate';

        if (window.confirm(`Are you sure you want to ${action} this student account?`)) {
            try {
                await instructorAPI.banUser(id, isBanned);
                fetchStudents(); // Refresh list
            } catch (error) {
                console.error('Failed to update ban status:', error);
                alert('Failed to update account status');
            }
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY delete this student account? This cannot be undone.`)) {
            try {
                await instructorAPI.deleteUser(id);
                fetchStudents(); // Refresh list
            } catch (error) {
                console.error('Failed to delete user:', error);
                alert(`Failed to delete student account`);
            }
        }
    };

    const handleOpenStudentModal = (student, mode) => {
        setEditingStudent(student);
        setStudentModalMode(mode);
        setIsStudentModalOpen(true);
    };

    const handleSaveStudentUpdate = async (e) => {
        e.preventDefault();
        try {
            await instructorAPI.updateUser(editingStudent.id, {
                username: editingStudent.name,
                student_id: editingStudent.studentId,
                email: editingStudent.email
            });
            setIsStudentModalOpen(false);
            fetchStudents();
        } catch (error) {
            console.error('Failed to update student:', error);
            alert('Failed to update student details');
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentId.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return theme === 'dark' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'rejected': return theme === 'dark' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-600 bg-rose-50 border-rose-200';
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

    return (
        <div className="flex flex-col h-full gap-8 overflow-y-auto overflow-x-hidden custom-scrollbar pb-10 pr-2">
            <style>{scrollbarStyles}</style>

            <div className={`flex flex-col flex-1 border rounded-2xl p-6 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0B1224] border-cyan-500/20' : 'bg-white border-slate-200'}`}>
                <div className="mb-6 flex-none flex flex-wrap gap-4 items-center justify-between">
                    <h2 className={`text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Student <span className="text-cyan-500">Management</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full not-italic tracking-normal transition-colors duration-500 ${theme === 'dark' ? 'text-slate-500 bg-slate-800' : 'text-slate-400 bg-slate-100'}`}>{students.length} Total</span>
                    </h2>
                    <div className="relative w-full max-w-sm">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className={`w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-cyan-500/50 outline-none transition-all duration-500 ${theme === 'dark' ? 'bg-slate-950/50 border-white/5 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'}`}
                        />
                    </div>
                </div>

                {/* Students Table */}
                <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-xl overflow-hidden bg-slate-950/20 border-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead className={`sticky top-0 z-10 text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-slate-900 text-slate-500 border-white/5' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            <tr>
                                <th className="p-4 border-b">Student</th>
                                <th className="p-4 border-b">ID Number</th>
                                <th className="p-4 border-b hidden md:table-cell">Email</th>
                                <th className="p-4 border-b text-center">Status</th>
                                <th className="p-4 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-cyan-500">Loading students...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">No students found</td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className={`border-b transition-colors group ${theme === 'dark' ? 'border-white/5 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border overflow-hidden ${theme === 'dark' ? 'border-white/10 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                                                    {student.avatar ? (
                                                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{student.name}</div>
                                                    <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">LVL {student.level}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`p-4 font-mono text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {student.studentId}
                                        </td>
                                        <td className={`p-4 text-sm hidden md:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {student.email}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full border ${getStatusColor(student.status)}`}>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenStudentModal(student, 'info')}
                                                    className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition-colors"
                                                    title="View Progress & Info"
                                                >
                                                    <Info className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenStudentModal(student, 'edit')}
                                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors"
                                                    title="Edit Account"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeactivateUser(student.id, student.status)}
                                                    className={`p-2 rounded-lg border transition-colors ${student.status === 'active'
                                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white'
                                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                                        }`}
                                                    title={student.status === 'active' ? "Disable Account" : "Enable Account"}
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(student.id)}
                                                    className="p-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors"
                                                    title="Delete Account"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* STUDENT Modal (Edit or Info) */}
            <AnimatePresence>
                {isStudentModalOpen && editingStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsStudentModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className={`relative w-full max-w-lg rounded-[2rem] border p-8 shadow-2xl ${theme === 'dark' ? 'bg-[#0B1224] border-white/10' : 'bg-white border-slate-200'}`}
                        >
                            <h2 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">
                                {studentModalMode === 'edit' ? 'Edit ' : 'Student '}
                                <span className={studentModalMode === 'edit' ? 'text-blue-500' : 'text-cyan-500'}>
                                    {studentModalMode === 'edit' ? 'Student' : 'Profile'}
                                </span>
                            </h2>
                            
                            {studentModalMode === 'edit' ? (
                                <form onSubmit={handleSaveStudentUpdate} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Username</label>
                                        <input
                                            type="text"
                                            value={editingStudent.name}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                            className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-950/50 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Student ID</label>
                                            <input
                                                type="text"
                                                value={editingStudent.studentId}
                                                onChange={(e) => setEditingStudent({ ...editingStudent, studentId: e.target.value })}
                                                className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-950/50 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Email</label>
                                            <input
                                                type="email"
                                                value={editingStudent.email}
                                                onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                                                className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all ${theme === 'dark' ? 'bg-slate-950/50 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button" onClick={() => setIsStudentModalOpen(false)}
                                            className="flex-1 py-3 rounded-xl border border-white/5 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-slate-400"
                                        >Cancel</button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                        >Save Changes</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                            {editingStudent.avatar ? (
                                                <img src={editingStudent.avatar} alt={editingStudent.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-10 h-10 text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{editingStudent.name}</h3>
                                            <p className="text-slate-500 text-sm mb-2">{editingStudent.email}</p>
                                            <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md border ${getStatusColor(editingStudent.status)}`}>
                                                {editingStudent.status} User
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Level</p>
                                            <p className={`text-2xl font-black text-cyan-500`}>{editingStudent.level}</p>
                                        </div>
                                        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total XP</p>
                                            <p className={`text-2xl font-black text-purple-500`}>{editingStudent.xp.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    
                                    <div className={`p-4 rounded-xl border flex flex-col gap-3 ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-400">Student ID:</span>
                                            <span className={`text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{editingStudent.studentId}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setIsStudentModalOpen(false)}
                                        className="w-full py-4 rounded-xl border border-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all mt-4"
                                    >
                                        Close Info
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default StudentManagement;
