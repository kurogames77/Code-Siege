import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Wallet, Smartphone, Globe, ShieldCheck, Zap, Gem, Loader2, CheckCircle2, ChevronLeft, Lock } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import gemIcon from '../../assets/gem.png';
import paypalIcon from '../../assets/paypalicon.png';
import gcashIcon from '../../assets/gcashicon.png';
import mayaIcon from '../../assets/mayaicon.png';
import useSound from '../../hooks/useSound';
import { userAPI, paymongoAPI } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
// PayPal Client ID from env
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

const TopUpModal = ({ isOpen, onClose }) => {
    const { playClick, playCancel, playSuccess, playError } = useSound();
    const { user, refreshUser } = useUser();
    const { info, error: toastError, success } = useToast();

    const [selectedMethod, setSelectedMethod] = useState('gcash');
    const [step, setStep] = useState('select'); // select, input, processing, success
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [formData, setFormData] = useState({
        accountNumber: '',
        password: '',
        mpin: ''
    });
    const [error, setError] = useState('');

    const resetState = () => {
        setStep('select');
        setSelectedPackage(null);
        setFormData({ accountNumber: '', password: '', mpin: '' });
        setError('');
    };

    const handleClose = () => {
        playCancel();
        resetState();
        onClose();
    };

    const handlePackageSelect = (pkg) => {
        playClick();
        setSelectedPackage(pkg);
        setStep('input');

        // Pre-fill some data for better UX testing
        if (selectedMethod === 'paypal') {
            setFormData(prev => ({ ...prev, accountNumber: user?.email || '' }));
        } else {
            setFormData(prev => ({ ...prev, accountNumber: '09' }));
        }
    };

    // Standard handler for Non-PayPal (GCash/Maya)
    const handlePayMongoPayment = async () => {
        playClick();
        setStep('processing');
        setError('');

        try {
            const amountInCentavos = selectedPackage.numericPrice * 100;
            const description = `${selectedPackage.gems} Gems Application Purchase`;
            const redirectUrls = {
                success: `${window.location.origin}/payment-callback`,
                failed: `${window.location.origin}/payment-callback`
            };

            let checkoutUrl = '';
            let paymentMethodData = {
                amount: amountInCentavos,
                description: description,
                gems: selectedPackage.gems,
                bonus: selectedPackage.bonus,
                prevBonus: selectedPackage.prevBonus,
                method: selectedMethod
            };

            // Unified Checkout Flow for all methods (GCash, Maya, etc.)
            // This ensures we use the robust PayMongo Checkout page which we confirmed works.
            console.log(`[TRACE] Initiating Checkout Session for ${selectedMethod}: ${amountInCentavos} centavos`);

            // Map 'maya' to 'paymaya' for API consistency if needed, though backend handles it
            const apiMethod = selectedMethod === 'maya' ? 'paymaya' : selectedMethod;

            const response = await paymongoAPI.createCheckoutSession(
                amountInCentavos,
                description,
                redirectUrls,
                { name: user?.name, email: user?.email },
                apiMethod
            );

            if (response.data && response.data.attributes && response.data.attributes.checkout_url) {
                checkoutUrl = response.data.attributes.checkout_url;
                paymentMethodData.sessionId = response.data.id;
                paymentMethodData.flow = 'checkout';
            } else {
                throw new Error(`Invalid ${selectedMethod} Checkout response`);
            }

            // Store pending payment details
            localStorage.setItem('pending_payment', JSON.stringify(paymentMethodData));

            // Show toast & redirect
            if (info) info(`Redirecting to ${selectedMethod === 'gcash' ? 'GCash' : 'Maya'} payment...`);
            setTimeout(() => {
                window.location.href = checkoutUrl;
            }, 1000);

        } catch (err) {
            console.error("PayMongo Payment failed:", err);
            setError('Failed to initialize payment. Please try again.');
            setStep('input');
            if (typeof playError === 'function') playError();
            if (toastError) toastError('Payment initialization failed');
        }
    };

    // PayPal Success Handler
    const handlePayPalSuccess = async (details) => {
        try {
            setStep('processing');
            const totalGems = selectedPackage.gems + (selectedPackage.bonus || 0) + (selectedPackage.prevBonus || 0);

            // In a real app, verify 'details.id' on backend. Here we trust the client sandbox callback.
            await userAPI.updateGems(user.id, totalGems);

            if (refreshUser) await refreshUser();

            if (playSuccess) playSuccess();

            if (success) {
                success('Top-up Successful! Gems Added.');
            } else {
                console.log('Top-up Successful! Gems Added.');
            }

            setStep('success');
            setTimeout(() => handleClose(), 3500);
        } catch (err) {
            console.error("PayPal processing failed:", err);
            setError('Failed to credit gems. Please contact support.');

            if (toastError) {
                toastError('Failed to connect to server.');
            }

            setStep('input');
            if (playError) playError();
        }
    };

    const paymentMethods = [
        { id: 'gcash', label: 'GCash', color: 'blue', icon: <img src={gcashIcon} alt="GCash" className="w-10 h-10 object-contain" /> },
        { id: 'paypal', label: 'PayPal', color: 'indigo', icon: <img src={paypalIcon} alt="PayPal" className="w-10 h-10 object-contain" /> },
        { id: 'maya', label: 'Maya', color: 'green', icon: <img src={mayaIcon} alt="Maya" className="w-10 h-10 object-contain" /> },
    ];

    const gemPackages = [
        {
            id: 1,
            gems: 275,
            bonus: 55,
            price: 'Php 200',
            numericPrice: 200,
            isBonus: true,
            isRecommended: false,
            color: 'from-cyan-500/20 to-blue-600/20',
            borderColor: 'border-cyan-500/30'
        },
        {
            id: 2,
            gems: 413,
            bonus: 83,
            price: 'Php 300',
            numericPrice: 300,
            isBonus: true,
            isRecommended: false,
            color: 'from-blue-500/20 to-indigo-600/20',
            borderColor: 'border-blue-500/30'
        },
        {
            id: 3,
            gems: 550,
            bonus: 110,
            price: 'Php 400',
            numericPrice: 400,
            isBonus: true,
            isRecommended: false,
            color: 'from-indigo-500/20 to-purple-600/20',
            borderColor: 'border-indigo-500/30'
        },
        {
            id: 4,
            gems: 688,
            bonus: 138,
            price: 'Php 500',
            numericPrice: 500,
            isBonus: true,
            isRecommended: false,
            color: 'from-purple-500/20 to-pink-600/20',
            borderColor: 'border-purple-500/30'
        },
        {
            id: 5,
            gems: 1375,
            bonus: 344,
            prevBonus: 69,
            price: 'Php 1,000',
            numericPrice: 1000,
            isBonus: true,
            isRecommended: true,
            tag: 'RECOMMENDED',
            color: 'from-pink-500/20 to-rose-600/20',
            borderColor: 'border-pink-500/50'
        },
        {
            id: 6,
            gems: 3438,
            bonus: 1032,
            prevBonus: 344,
            price: 'Php 2,500',
            numericPrice: 2500,
            isBonus: true,
            isRecommended: false,
            tag: 'SPECIAL PROMO',
            color: 'from-amber-500/20 to-orange-600/20',
            borderColor: 'border-amber-500/50'
        },
        {
            id: 7,
            gems: 6875,
            bonus: 2406,
            prevBonus: 1031,
            price: 'Php 5,000',
            numericPrice: 5000,
            isBonus: true,
            isRecommended: false,
            tag: 'BEST VALUE',
            isFullWidth: true, // For the bottom large banner
            color: 'from-yellow-500/20 to-amber-700/20',
            borderColor: 'border-yellow-500/50'
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const getThemeColor = (methodId) => {
        switch (methodId) {
            case 'gcash': return 'blue';
            case 'paypal': return 'indigo';
            case 'maya': return 'emerald';
            default: return 'blue';
        }
    };

    const themeColor = getThemeColor(selectedMethod);

    return (
        <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "PHP" }}>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-galsb">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-4xl bg-[#0a0f1a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative min-h-[600px] flex flex-col"
                        >
                            {/* Header Background */}
                            <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-${themeColor}-900/40 to-cyan-900/40 pointer-events-none transition-colors duration-500`} />

                            {/* Header */}
                            <div className="relative p-8 pb-4 flex items-center justify-between z-10">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 bg-${themeColor}-500/20 rounded-2xl border border-${themeColor}-500/30 transition-colors duration-500`}>
                                        <Gem className={`w-8 h-8 text-${themeColor}-400 transition-colors duration-500`} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                                            GEM <span className={`text-${themeColor}-400 transition-colors duration-500`}>STORE</span>
                                        </h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                            <ShieldCheck className={`w-4 h-4 text-${themeColor}-500 transition-colors duration-500`} /> Secure {selectedMethod === 'paypal' ? 'PayPal' : selectedMethod === 'maya' ? 'Maya' : 'GCash'} Transaction
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleClose}
                                    className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-rose-500 hover:border-rose-500 border border-white/5 rounded-full transition-all duration-300 hover:rotate-180 group"
                                >
                                    <X className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                </button>
                            </div>

                            {/* VIEW: SELECT PACKAGE */}
                            {step === 'select' && (
                                <>
                                    {/* Payment Methods Tabs */}
                                    <div className="px-8 mt-6 relative z-10 flex justify-center">
                                        <div className="flex items-center gap-4 p-2 bg-black/40 rounded-2xl border border-white/5 w-fit">
                                            {paymentMethods.map((method) => (
                                                <button
                                                    key={method.id}
                                                    onClick={() => { playClick(); setSelectedMethod(method.id); }}
                                                    className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all font-bold text-sm uppercase tracking-wide ${selectedMethod === method.id
                                                        ? `bg-${method.color}-600 text-white shadow-lg shadow-${method.color}-600/20 scale-105`
                                                        : 'text-slate-500 hover:text-white hover:bg-white/5 grayscale hover:grayscale-0'
                                                        }`}
                                                >
                                                    {method.icon}
                                                    {method.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Content Grid */}
                                    <div className="px-8 pb-8 pt-6 h-[50vh] overflow-y-auto custom-scrollbar">
                                        <motion.div
                                            initial="hidden"
                                            animate="visible"
                                            variants={containerVariants}
                                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                        >
                                            {gemPackages.map((pkg) => (
                                                <motion.div
                                                    key={pkg.id}
                                                    variants={itemVariants}
                                                    className={`relative group bg-gradient-to-br ${pkg.color} border ${pkg.borderColor} rounded-3xl p-6 flex flex-col items-center text-center transition-all hover:scale-[1.02] hover:shadow-xl ${pkg.isFullWidth ? 'lg:col-span-3 lg:flex-row lg:justify-between lg:px-12' : ''
                                                        }`}
                                                >
                                                    {pkg.tag && (
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg z-20">
                                                            {pkg.tag}
                                                        </div>
                                                    )}

                                                    <div className={`relative mb-4 ${pkg.isFullWidth ? 'lg:mb-0 lg:order-1' : ''}`}>
                                                        <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
                                                        <img
                                                            src={gemIcon}
                                                            alt="Gems"
                                                            className={`object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110 group-hover:-rotate-3 ${pkg.isFullWidth ? 'w-24 h-24' : 'w-24 h-24'
                                                                }`}
                                                        />
                                                    </div>

                                                    <div className={`${pkg.isFullWidth ? 'lg:text-left lg:order-2 lg:flex-1 lg:pl-8' : ''}`}>
                                                        <h3 className="text-3xl font-black text-white italic tracking-tighter mb-1">
                                                            {pkg.gems} <span className="text-sm not-italic font-bold text-slate-300">GEM</span>
                                                        </h3>

                                                        {(pkg.bonus > 0 || pkg.prevBonus > 0) && (
                                                            <div className="flex flex-col items-center gap-0.5 mb-4 lg:items-start transition-all">
                                                                {pkg.prevBonus && (
                                                                    <span className="text-[10px] text-slate-500 line-through font-bold">
                                                                        + BONUS {pkg.prevBonus}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                                                                    + BONUS {pkg.bonus} = {pkg.gems + pkg.bonus}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className={`${pkg.isFullWidth ? 'lg:order-3' : 'w-full mt-auto'}`}>
                                                        <button
                                                            onClick={() => handlePackageSelect(pkg)}
                                                            className={`w-full py-3 rounded-xl border border-white/20 font-black text-white uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg ${pkg.isFullWidth
                                                                ? 'bg-yellow-500 border-yellow-400 hover:bg-yellow-400 text-black px-12'
                                                                : 'bg-white/10 hover:bg-white/20'
                                                                }`}
                                                        >
                                                            Buy {pkg.price}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    </div>
                                </>
                            )}


                            {/* VIEW: PAYMENT INPUT */}
                            {step === 'input' && selectedPackage && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex-1 flex flex-col px-12 pb-12 relative"
                                >


                                    <div className="flex-1 flex items-center gap-12 mt-8">
                                        {/* Order Summary Left */}
                                        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden">
                                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${themeColor}-500 to-transparent`} />
                                            <img src={gemIcon} alt="Gems" className="w-32 h-32 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] mb-6 animate-pulse" />

                                            <h3 className="text-4xl font-black text-white italic tracking-tighter mb-2">
                                                {selectedPackage.gems + (selectedPackage.bonus || 0)} <span className="text-lg not-italic text-slate-400">GEMS</span>
                                            </h3>
                                            <div className="bg-black/40 rounded-xl px-6 py-2 border border-white/10 mb-6">
                                                <span className="text-xl font-bold text-white tracking-widest">{selectedPackage.price}</span>
                                            </div>

                                            <div className="w-full space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 font-bold uppercase">Provider</span>
                                                    <span className="text-white font-bold">{paymentMethods.find(p => p.id === selectedMethod)?.label}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 font-bold uppercase">Account</span>
                                                    <span className="text-white font-bold truncate max-w-[150px]">{user?.email || 'N/A'}</span>
                                                </div>
                                                <div className="w-full h-px bg-white/10 my-2" />
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 font-bold uppercase">Total Due</span>
                                                    <span className={`text-${themeColor}-400 font-black`}>{selectedPackage.price}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Interface Right */}
                                        <div className="flex-1 max-w-sm max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                            <button
                                                onClick={() => { playCancel(); setStep('select'); setSelectedPackage(null); }}
                                                className="flex items-center gap-2 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors mb-4 group"
                                            >
                                                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Packages
                                            </button>

                                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3 sticky top-0 bg-[#0a0f1a] z-10 py-2">
                                                {selectedMethod === 'paypal' ? 'Pay with PayPal' : `Login to ${paymentMethods.find(p => p.id === selectedMethod)?.label}`}
                                            </h3>

                                            {/* REAL PAYPAL BUTTONS */}
                                            {selectedMethod === 'paypal' ? (
                                                <div className="w-full space-y-4">
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                                                        <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">Sandbox Mode Active</p>
                                                        <p className="text-[10px] text-slate-500">You will be redirected to PayPal Sandbox to complete this test transaction.</p>
                                                    </div>

                                                    <PayPalButtons
                                                        style={{ layout: "vertical", shape: "rect", borderRadius: 10 }}
                                                        createOrder={(data, actions) => {
                                                            return actions.order.create({
                                                                purchase_units: [
                                                                    {
                                                                        amount: {
                                                                            value: selectedPackage.numericPrice.toString(),
                                                                            currency_code: "PHP"
                                                                        },
                                                                        description: `${selectedPackage.gems} Gems Application Purchase`
                                                                    },
                                                                ],
                                                            });
                                                        }}
                                                        onApprove={(data, actions) => {
                                                            return actions.order.capture().then((details) => {
                                                                handlePayPalSuccess(details);
                                                            });
                                                        }}
                                                        onCancel={(data) => {
                                                            console.log("PayPal Cancelled:", data);
                                                            playCancel();
                                                            setError("Payment was cancelled.");
                                                            info('Transaction Cancelled');
                                                        }}
                                                        onError={(err) => {
                                                            console.error("PayPal Error:", err);
                                                            playError();
                                                            setError("PayPal connection failed. Try again.");
                                                            toastError('PayPal Connection Failed');
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                /* SIMULATED GCASH/MAYA FORM */
                                                /* REAL PAYMONGO CHECKOUT */
                                                <div className="space-y-6">
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                                                        <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">Test Mode Active</p>
                                                        <p className="text-[10px] text-slate-500">
                                                            You will be redirected to a secure <strong>PayMongo Sandbox Page</strong>.
                                                            <br />No real money will be deducted.
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            playClick();
                                                            // For Test Mode, redirect to our mock page
                                                            const paymentMethodData = {
                                                                amount: selectedPackage.numericPrice * 100,
                                                                description: `${selectedPackage.gems} Gems Application Purchase`,
                                                                gems: selectedPackage.gems,
                                                                bonus: selectedPackage.bonus,
                                                                prevBonus: selectedPackage.prevBonus,
                                                                method: selectedMethod,
                                                                flow: 'checkout',
                                                                sessionId: 'test_session_' + Date.now()
                                                            };
                                                            localStorage.setItem('pending_payment', JSON.stringify(paymentMethodData));
                                                            window.location.href = '/test-payment';
                                                        }}
                                                        className={`w-full py-4 rounded-xl bg-${themeColor}-600 hover:bg-${themeColor}-500 text-white font-black uppercase tracking-widest shadow-lg shadow-${themeColor}-600/20 active:scale-95 transition-all flex items-center justify-center gap-2`}
                                                    >
                                                        Proceed to {selectedMethod === 'gcash' ? 'GCash' : 'Maya'} <span className="opacity-50">|</span> {selectedPackage.price}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* VIEW: PROCESSING */}
                            {step === 'processing' && (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                    <div className="relative mb-8">
                                        <div className={`absolute inset-0 bg-${themeColor}-500/20 blur-2xl rounded-full animate-pulse`} />
                                        <Loader2 className={`w-20 h-20 text-${themeColor}-500 animate-spin relative z-10`} />
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
                                        Processing Payment...
                                    </h3>
                                    <p className="text-sm text-slate-400 font-bold">Verifying transaction with {paymentMethods.find(p => p.id === selectedMethod)?.label}...</p>
                                </div>
                            )}

                            {/* VIEW: SUCCESS */}
                            {step === 'success' && (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className={`w-24 h-24 bg-${themeColor}-500 rounded-full flex items-center justify-center shadow-2xl shadow-${themeColor}-500/50 mb-8`}
                                    >
                                        <CheckCircle2 className="w-12 h-12 text-white" />
                                    </motion.div>
                                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">
                                        Payment Approved!
                                    </h3>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-4 flex flex-col items-center">
                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Credited</span>
                                        <div className="flex items-center gap-2">
                                            <img src={gemIcon} alt="Gems" className="w-6 h-6" />
                                            <span className="text-2xl font-black text-white tracking-widest">
                                                {selectedPackage.gems + (selectedPackage.bonus || 0)} GEMS
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer Info - Only on Select Screen */}
                            {step === 'select' && (
                                <div className="p-4 border-t border-white/5 bg-black/40 text-center">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        Purchases are secure and instantly credited to your account.
                                    </p>
                                </div>
                            )}

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </PayPalScriptProvider >
    );
};

export default TopUpModal;
