import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import '../styles/landing-page.css'; // Reuse landing page styles for consistency

const ConfirmationPage = () => {
    const navigate = useNavigate();

    const handleReturnLogin = () => {
        navigate('/', { state: { openLogin: true } });
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
                {/* Background glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
                        <Check className="text-emerald-400 w-10 h-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">Email Confirmed!</h1>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Your account has been successfully verified. You can now log in to Code Siege and begin your journey.
                    </p>

                    <button
                        onClick={handleReturnLogin}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Return to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationPage;
