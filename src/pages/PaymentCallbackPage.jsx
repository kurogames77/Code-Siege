import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { paymongoAPI, userAPI } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

const PaymentCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, refreshUser, loading } = useUser();
    const { success: showSuccess, error: showError } = useToast();
    const processedRef = React.useRef(false);

    const [status, setStatus] = useState('processing'); // processing, success, failed, auth_required
    const [message, setMessage] = useState('Verifying payment...');

    useEffect(() => {
        const processPayment = async () => {
            if (loading) return; // Wait for auth check

            if (!user) {
                setStatus('auth_required');
                setMessage('Please log in to claim your purchase.');
                return;
            }

            if (processedRef.current) return;
            processedRef.current = true;

            const urlStatus = searchParams.get('status');
            const storedPayment = localStorage.getItem('pending_payment');

            if (!storedPayment) {
                setStatus('failed');
                setMessage('No pending payment found.');
                return;
            }


            const paymentData = JSON.parse(storedPayment);

            try {
                // 1. User check handled above


                // 2. Capture or Verify Payment
                if (paymentData.flow === 'intent') {
                    setMessage('Verifying payment status...');
                    const intentResponse = await paymongoAPI.getPaymentIntent(paymentData.paymentIntentId);
                    const intent = intentResponse.data;

                    // Succeeded status means payment is complete
                    const hasPaid = intent.attributes.status === 'succeeded';

                    if (!hasPaid) {
                        throw new Error('Payment not confirmed or was cancelled.');
                    }
                } else if (paymentData.flow === 'checkout') {
                    setMessage('Verifying session...');
                    const sessionResponse = await paymongoAPI.getCheckoutSession(paymentData.sessionId);
                    const session = sessionResponse.data;

                    // Simple verification: check if it's paid
                    const hasPaid = session.attributes.payments?.length > 0 ||
                        session.attributes.payment_intent?.attributes?.status === 'succeeded';

                    if (!hasPaid) {
                        throw new Error('Payment not confirmed or was cancelled.');
                    }
                } else {
                    // Fallback for any legacy pending payments
                    throw new Error('Unsupported payment flow. Please try again.');
                }

                // 3. Credit Gems
                setMessage('Crediting gems...');
                const totalGems = paymentData.gems + (paymentData.bonus || 0) + (paymentData.prevBonus || 0);
                await userAPI.updateGems(user.id, totalGems);

                console.log("Gems Credited Successfully:", totalGems);

                if (refreshUser) await refreshUser();

                setStatus('success');
                setMessage('Payment successful! Redirecting...');
                localStorage.removeItem('pending_payment');
                showSuccess(`Successfully added ${totalGems} Gems!`);

                setTimeout(() => {
                    navigate('/play');
                }, 3000);

            } catch (err) {
                console.error("Payment Verification Failed:", err);
                setStatus('failed');
                // Extract backend error message if available
                const errorMsg = err.details?.errors?.[0]?.detail || err.details?.message || err.message || 'Verification failed';
                setMessage(`Failed: ${errorMsg}`);
                showError('Payment verification failed.');
            }
        };

        processPayment();
    }, [searchParams, navigate, user, refreshUser, showSuccess, showError]);

    return (
        <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4 font-galsb">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-12 max-w-md w-full text-center flex flex-col items-center"
            >
                {status === 'processing' && (
                    <>
                        <Loader2 className="w-16 h-16 text-cyan-500 animate-spin mb-6" />
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Processing</h2>
                        <p className="text-slate-400 font-bold">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-6" />
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Success!</h2>
                        <p className="text-slate-400 font-bold">{message}</p>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <XCircle className="w-16 h-16 text-rose-500 mb-6" />
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Payment Stopped</h2>
                        <p className="text-slate-400 font-bold mb-8">
                            {message === 'Payment not confirmed by Maya yet.'
                                ? 'The payment was not completed or is still being processed.'
                                : message}
                        </p>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => navigate('/play', { state: { openShop: true } })}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-600/20 active:scale-95"
                            >
                                Back to Gem Store
                            </button>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                Don't worry, no gems were deducted.
                            </p>
                        </div>
                    </>
                )}

                {status === 'auth_required' && (
                    <>
                        <Lock className="w-16 h-16 text-amber-500 mb-6" />
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Login Required</h2>
                        <p className="text-slate-400 font-bold mb-8 text-center max-w-sm">
                            Your session has expired. Please log in to your account to verify and claim your gems.
                        </p>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => navigate('/', { state: { openLogin: true, returnUrl: '/payment-callback' } })}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                            >
                                Back to Login
                            </button>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                Your payment is safe. Just log in to claim it.
                            </p>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default PaymentCallbackPage;
