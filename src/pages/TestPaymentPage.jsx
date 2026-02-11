import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, CreditCard } from 'lucide-react';
import gcashIcon from '../assets/gcashicon.png';
import mayaIcon from '../assets/mayaicon.png';

const TestPaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [data, setData] = useState(null);

    useEffect(() => {
        // Retrieve pending payment data
        const stored = localStorage.getItem('pending_payment');
        if (stored) {
            setData(JSON.parse(stored));
        }
    }, []);

    const handleOutcome = (status) => {
        // Redirect to callback with status
        navigate(`/payment-callback?status=${status}`);
    };

    if (!data) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;

    const { amount, description, method } = data;
    const amountFormatted = (amount / 100).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

    return (
        <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center py-12 px-4 font-sans text-slate-800">
            {/* PayMongo Header Imitation */}
            <div className="w-full max-w-lg flex items-center gap-2 mb-8 opacity-50 grayscale">
                <div className="font-bold text-xl tracking-tight flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-800 rounded-md"></div>
                    PayMongo
                </div>
            </div>

            <div className="w-full max-w-lg bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {/* Order Summary */}
                <div className="p-8 border-b border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Gem Purchase</h2>
                            <p className="text-slate-500 text-sm mt-1">{description}</p>
                        </div>
                    </div>
                    <div className="mt-6 flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-slate-900">{amountFormatted}</span>
                        <span className="text-slate-400 font-medium">PHP</span>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="p-8 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Payment Method</p>
                    <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
                        <img
                            src={method === 'gcash' ? gcashIcon : mayaIcon}
                            alt={method}
                            className="w-8 h-8 object-contain"
                        />
                        <span className="font-bold text-slate-700 capitalize">{method}</span>
                        <div className="ml-auto flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold">
                            <ShieldCheck className="w-3 h-3" /> Secure
                        </div>
                    </div>
                </div>

                {/* Simulation Controls */}
                <div className="p-8">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <p className="text-amber-700 text-xs font-bold uppercase tracking-wide mb-1">Test Mode Environment</p>
                        <p className="text-amber-600/80 text-sm">This is a simulated payment page for development.</p>
                    </div>

                    <p className="text-center text-slate-500 text-sm mb-4 font-medium">Authorize this transaction?</p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleOutcome('failed')}
                            className="py-3 rounded-md border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancel / Fail
                        </button>
                        <button
                            onClick={() => handleOutcome('succeeded')}
                            className="py-3 rounded-md bg-[#2f1c59] text-white font-bold hover:bg-[#1a0f35] transition-colors shadow-lg shadow-purple-900/10"
                        >
                            Authorize Payment
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-slate-400 text-sm">
                <Lock className="w-3 h-3" />
                <span>Secured by PayMongo (Simulated)</span>
            </div>
        </div>
    );
};

export default TestPaymentPage;
