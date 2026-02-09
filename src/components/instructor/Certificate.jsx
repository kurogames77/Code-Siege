import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { instructorAPI } from '../../services/api';
import {
    Award,
    Download,
    Eye,
    CheckCircle,
    Clock,
    Search,
    Filter,
    X,
    Upload,
    FileText
} from 'lucide-react';

const Certificate = ({ theme }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'pending'
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState(null);
    const [editableName, setEditableName] = useState('');
    const [isViewMode, setIsViewMode] = useState(false);
    const [certificateTemplate, setCertificateTemplate] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState('');

    // Fetch Certificates
    const { data: remoteData, isLoading } = useQuery({
        queryKey: ['instructor-certificates'],
        queryFn: () => instructorAPI.getCertificates(),
    });

    const certificates = remoteData?.certificates?.map(cert => ({
        id: cert.id,
        studentName: cert.users?.username || 'N/A',
        avatar: cert.users?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + cert.id,
        course: cert.course_name || 'N/A',
        grade: cert.grade || 'N/A',
        completionDate: new Date(cert.issued_at).toLocaleDateString(),
        certificateId: cert.certificate_id || cert.id,
        status: 'completed'
    })) || [];

    const filteredCertificates = certificates.filter(cert => {
        const matchesSearch = cert.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cert.course.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDownloadCertificate = (certificate) => {
        setNotificationMessage(`Downloading certificate for ${certificate.studentName}...`);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        // In a real application, you would generate and download the PDF here.
        console.log('Downloading certificate:', certificate);
    };

    const handleViewCertificate = (certificate) => {
        setNotificationMessage(`Viewing certificate for ${certificate.studentName}...`);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        // In a real application, you would open a preview modal or page here.
        console.log('Viewing certificate:', certificate);
    };

    const handleTemplateUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate file type (accept images, PDFs, or HTML)
            const validTypes = ['image/png', 'image/jpeg', 'application/pdf', 'text/html'];
            if (!validTypes.includes(file.type)) {
                setNotificationMessage('Invalid file type. Please upload PNG, JPEG, PDF, or HTML.');
                setShowNotification(true);
                setTimeout(() => setShowNotification(false), 3000);
                return;
            }

            setCertificateTemplate(file);
            setUploadedFileName(file.name);
            setNotificationMessage(`Certificate template "${file.name}" uploaded successfully!`);
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 3000);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Notification */}
            {showNotification && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-sm font-medium ${theme === 'dark' ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white'}`}
                >
                    {notificationMessage}
                </motion.div>
            )}

            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-3xl font-black uppercase italic tracking-wider font-galsb transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Certificate Management
                    </h2>
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] mt-1 transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Auto-generated certificates for course completion
                    </p>
                </div>

                {/* Total Certificates Badge */}
                <div className="flex items-center gap-4">
                    {/* Upload Template Button */}
                    <div className="relative">
                        <input
                            type="file"
                            id="certificate-template"
                            accept=".png,.jpg,.jpeg,.pdf,.html"
                            onChange={handleTemplateUpload}
                            className="hidden"
                        />
                        <label
                            htmlFor="certificate-template"
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${theme === 'dark' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'}`}
                        >
                            <Upload className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-widest">
                                {uploadedFileName ? 'Change Template' : 'Upload Template'}
                            </span>
                        </label>
                    </div>

                    {/* Show uploaded file name */}
                    {uploadedFileName && (
                        <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <FileText className="w-4 h-4 text-purple-500" />
                            <span className={`text-xs font-medium transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                {uploadedFileName}
                            </span>
                        </div>
                    )}

                    <div className={`px-4 py-2 border rounded-xl transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {certificates.length} Total Certificates
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900/50 border-white/5 focus-within:border-cyan-500/50' : 'bg-white border-slate-200 focus-within:border-cyan-500 shadow-sm'}`}>
                    <Search className={`w-5 h-5 transition-colors ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by student name or course..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`flex-1 bg-transparent outline-none text-sm font-medium transition-colors ${theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                    />
                </div>
            </div>

            {/* Certificates Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-[2.5rem] overflow-hidden transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.02)]'}`}
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={`border-b transition-colors ${theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-slate-50'}`}>
                                <th className={`px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Student</th>
                                <th className={`px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Course</th>
                                <th className={`px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Grade</th>
                                <th className={`px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Date</th>
                                <th className={`px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Certificate ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCertificates.length > 0 ? (
                                filteredCertificates.map((cert, idx) => (
                                    <motion.tr
                                        key={cert.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`border-b transition-colors ${theme === 'dark' ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={cert.avatar}
                                                    alt={cert.studentName}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <span className={`text-sm font-bold transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                    {cert.studentName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-xs font-medium transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {cert.course}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-sm font-black italic transition-colors ${cert.score >= 90 ? 'text-emerald-500' : cert.score >= 80 ? 'text-amber-500' : 'text-slate-500'}`}>
                                                {cert.grade}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-xs font-medium transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {cert.completionDate || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-xs font-mono font-bold transition-colors ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                {cert.certificateId}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <Award className="w-12 h-12 mb-4 text-slate-500" />
                                            <p className={`text-sm font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                No Certificates Issued Yet
                                            </p>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Certificates will appear here once students complete towers.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default Certificate;
