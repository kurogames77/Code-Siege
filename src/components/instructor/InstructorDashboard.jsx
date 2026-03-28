import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    GraduationCap,
    ShieldCheck,
    Layers,
    Zap,
    Clock,
    TrendingUp,
    BookOpen
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line
} from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import supabase from '../../lib/supabase';
import { instructorAPI } from '../../services/api';

const InstructorDashboard = ({ theme }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const queryClient = useQueryClient();

    const { data: statsData = {
        totalStudents: 0,
        totalInstructors: 0,
        totalBattles: 0,
        totalCertificates: 0,
        newUsersThisWeek: 0
    }, isLoading } = useQuery({
        queryKey: ['instructorStats'],
        queryFn: () => instructorAPI.getStats(),
    });

    // Fetch instructor's own courses to determine if they have any
    const { data: instructorCourses = [], isLoading: coursesLoading } = useQuery({
        queryKey: ['instructorCourses'],
        queryFn: () => instructorAPI.getCourses(),
    });

    const hasNoCourses = !coursesLoading && instructorCourses.length === 0;

    // Real-time updates: invalidated cache when database changes
    useEffect(() => {
        const channel = supabase
            .channel('dashboard-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                () => queryClient.invalidateQueries(['instructorStats'])
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'battles' },
                () => queryClient.invalidateQueries(['instructorStats'])
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'certificates' },
                () => queryClient.invalidateQueries(['instructorStats'])
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Generate completion data dynamically based on assigned courses
    const courseCompletionData = instructorCourses.length > 0
        ? instructorCourses.map(course => ({
            name: course.name,
            count: 0 // Will be populated with actual API data in the future
        }))
        : [
            { name: 'Python', count: 0 } // Fallback
        ];

    const completionRate = statsData.totalStudents > 0
        ? Math.round((statsData.totalCertificates / statsData.totalStudents) * 100)
        : 0;

    const stats = [
        { label: 'Total Students', value: statsData.totalStudents.toLocaleString(), trend: statsData.newUsersThisWeek > 0 ? `+${statsData.newUsersThisWeek} this week` : 'No new students', icon: GraduationCap, color: 'cyan' },
        { label: 'Student Completion Rate', value: `${completionRate}%`, trend: 'Avg. Progress', icon: Zap, color: 'amber' },
    ];

    const certificateData = [
        { month: 'Jan', issued: 0 },
        { month: 'Feb', issued: 0 },
        { month: 'Mar', issued: 0 },
        { month: 'Apr', issued: 0 },
        { month: 'May', issued: 0 },
        { month: 'Jun', issued: statsData.totalCertificates },
    ];

    const chartColors = {
        text: theme === 'dark' ? '#94a3b8' : '#64748b',
        grid: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        tooltipBg: theme === 'dark' ? '#0B1224' : '#FFFFFF',
        tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    };

    if (isLoading || coursesLoading) {
        return <div className="p-8 text-center text-slate-500">Loading dashboard data...</div>;
    }

    // If instructor has no courses, show empty state
    if (hasNoCourses) {
        return (
            <div className="space-y-8 pb-10">
                {/* Header Area */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className={`text-3xl font-black uppercase italic tracking-wider font-galsb transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Overview</h2>
                        <p className={`text-xs font-bold uppercase tracking-[0.2em] mt-1 transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Real-time status of the Code Siege ecosystem</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`px-6 py-3 border rounded-2xl flex items-center gap-3 transition-all duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <Clock className="w-4 h-4 text-cyan-500" />
                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-12 border rounded-[2.5rem] text-center transition-all duration-200 ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.02)]'}`}
                >
                    <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                        <BookOpen className="w-8 h-8" />
                    </div>
                    <h3 className={`text-xl font-black italic mb-3 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>No Courses Yet</h3>
                    <p className={`text-sm font-medium max-w-md mx-auto transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        You haven't created any courses yet. Head over to <span className={`font-bold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>Puzzle Courses</span> to create your first course and start tracking student progress.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-3xl font-black uppercase italic tracking-wider font-galsb transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Overview</h2>
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] mt-1 transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Real-time status of the Code Siege ecosystem</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-6 py-3 border rounded-2xl flex items-center gap-3 transition-all duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                        }`}>
                        <Clock className="w-4 h-4 text-cyan-500" />
                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-6 border rounded-[2rem] relative overflow-hidden group transition-all duration-200 shadow-xl ${theme === 'dark' ? 'bg-slate-900/40 border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-cyan-500 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)]'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${theme === 'dark' ? `bg-${stat.color}-500/10 text-${stat.color}-400` : `bg-${stat.color}-50 text-${stat.color}-600`
                                    }`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="text-right">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'
                                        }`}>
                                        {stat.trend}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4">
                                <h3 className={`text-2xl font-black italic tracking-tighter transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</h3>
                                <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{stat.label}</p>
                            </div>

                            {/* Background Glow */}
                            <div className={`absolute -right-8 -bottom-8 w-24 h-24 blur-[40px] rounded-full transition-all duration-700 ${theme === 'dark' ? `bg-${stat.color}-500/5 group-hover:bg-${stat.color}-500/10` : `bg-${stat.color}-500/[0.03] group-hover:bg-${stat.color}-500/[0.08]`
                                }`} />
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Certification Flow Line Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`p-8 border rounded-[2.5rem] relative overflow-hidden transition-all duration-200 ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.02)]'
                        }`}
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className={`text-xs font-black uppercase tracking-[0.3em] transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>Certification Flow</h3>
                            <p className={`text-lg font-black italic mt-1 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Monthly Certificates Issued</p>
                        </div>
                        <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="99%" height="100%">
                            <LineChart data={certificateData}>
                                <Tooltip
                                    contentStyle={{
                                        background: chartColors.tooltipBg,
                                        border: `1px solid ${chartColors.tooltipBorder}`,
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        color: theme === 'dark' ? '#FFF' : '#000',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="issued"
                                    stroke={theme === 'dark' ? '#10B981' : '#059669'}
                                    strokeWidth={3}
                                    dot={{ fill: theme === 'dark' ? '#10B981' : '#059669', r: 4 }}
                                    activeDot={{ r: 6, stroke: theme === 'dark' ? '#0B1224' : '#FFF', strokeWidth: 2 }}
                                    className={theme === 'dark' ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" : ""}
                                />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartColors.text, fontSize: 10 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* 2. Course Metrics Bar Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className={`p-8 border rounded-[2.5rem] relative overflow-hidden transition-all duration-200 ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.02)]'
                        }`}
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className={`text-xs font-black uppercase tracking-[0.3em] transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>Course Metrics</h3>
                            <p className={`text-lg font-black italic mt-1 transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Student Completions</p>
                        </div>
                        <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>

                    <div className="w-full" style={{ height: Math.max(80, courseCompletionData.length * 45) }}>
                        <ResponsiveContainer width="99%" height="100%">
                            <BarChart data={courseCompletionData} layout="vertical" margin={{ left: 20 }}>
                                <Tooltip
                                    cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                                    contentStyle={{
                                        background: chartColors.tooltipBg,
                                        border: `1px solid ${chartColors.tooltipBorder}`,
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        color: theme === 'dark' ? '#FFF' : '#000',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 700 }}
                                    width={100}
                                />
                                <Bar
                                    dataKey="count"
                                    fill={theme === 'dark' ? '#F59E0B' : '#D97706'}
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                    className={theme === 'dark' ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" : ""}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default InstructorDashboard;
