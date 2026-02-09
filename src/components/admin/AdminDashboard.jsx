import React from 'react';
import { Activity, Server, Users, FileText, Activity as ActivityIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { instructorAPI } from '../../services/api';

const AdminDashboard = ({ theme = 'dark' }) => {
    const [currentTime, setCurrentTime] = React.useState(new Date());

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    const [stats, setStats] = React.useState([
        { label: 'Total Students', value: '0', status: 'Total', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-500' },
        { label: 'Total Instructors', value: '0', status: 'Total', icon: Server, color: 'text-purple-500', bg: 'bg-purple-500' },
        { label: 'Total Applicants', value: '0', status: 'Total', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500' },
    ]);
    const [instructorActivity, setInstructorActivity] = React.useState([
        { month: 'Jan', active: 1 }, { month: 'Feb', active: 0 },
        { month: 'Mar', active: 0 }, { month: 'Apr', active: 0 },
        { month: 'May', active: 0 }, { month: 'Jun', active: 0 },
        { month: 'Jul', active: 0 }, { month: 'Aug', active: 0 },
        { month: 'Sep', active: 0 }, { month: 'Oct', active: 0 },
        { month: 'Nov', active: 0 }, { month: 'Dec', active: 0 },
    ]);

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        const fetchStats = async () => {
            try {
                const data = await instructorAPI.getStats();
                setStats([
                    { label: 'Total Students', value: data.totalStudents.toString(), status: 'Total', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-500' },
                    { label: 'Total Instructors', value: data.totalInstructors.toString(), status: 'Total', icon: Server, color: 'text-purple-500', bg: 'bg-purple-500' },
                    { label: 'Total Applicants', value: (data.totalApplications || 0).toString(), status: 'Total', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500' },
                ]);

                if (data.instructorActivity) {
                    setInstructorActivity(data.instructorActivity);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            }
        };

        fetchStats();
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className={`text-3xl font-black uppercase italic tracking-tighter mb-2 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>System<span className="text-cyan-500">Status</span></h2>
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-500/50 uppercase tracking-widest text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
                        Live Monitoring Activity
                    </div>
                </div>

                <div className={`font-mono text-xl font-bold tracking-widest transition-colors duration-500 pt-1 ${theme === 'dark' ? 'text-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'text-slate-500'}`}>
                    {formatTime(currentTime)}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="flex flex-wrap gap-6">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className={`border p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden group transition-all duration-500 min-w-[280px] flex-1 ${theme === 'dark' ? 'bg-[#0B1224]/40 border-white/5 hover:border-cyan-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-cyan-500/50'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-xl transition-colors duration-500 ${theme === 'dark' ? 'bg-white/5 shadow-inner' : 'bg-slate-50 border border-slate-100'} ${stat.color}`}>
                                    <Icon className="w-7 h-7" />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded border transition-colors duration-500 ${theme === 'dark' ? 'border-white/5 text-cyan-400 bg-black/50' : 'border-slate-100 text-cyan-600 bg-slate-50'}`}>{stat.status}</span>
                            </div>
                            <h3 className={`text-4xl font-black italic tracking-tighter mb-1 transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>

                            {/* Decorative line */}
                            <div className={`absolute bottom-0 left-0 h-1 w-full ${stat.bg}/10`}>
                                <div className={`h-full ${stat.bg} w-[40%] transition-all duration-1000 group-hover:w-[60%]`} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Chart */}
            <div className={`border rounded-[2.5rem] p-8 backdrop-blur-sm relative overflow-hidden transition-all duration-500 ${theme === 'dark' ? 'bg-[#0B1224]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex justify-between items-center mb-8">
                    <h3 className={`text-lg font-black uppercase italic tracking-wide transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Instructor Activity</h3>
                    <select className={`border text-xs font-bold uppercase tracking-wider rounded-lg px-4 py-2 outline-none focus:border-cyan-500/50 transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <option>Year 2026</option>
                    </select>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={instructorActivity}>
                            <defs>
                                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: theme === 'dark' ? '#020617' : '#FFFFFF', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '12px' }}
                                itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="active" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorActivity)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
