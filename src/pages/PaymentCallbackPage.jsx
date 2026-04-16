import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCallbackPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Since PayMongo is removed and manual payments have no automated callback,
        // any visit to this page is obsolete. Just redirect back to play.
        navigate('/play');
    }, [navigate]);

    return (
        <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
            <h2 className="text-white text-xl animate-pulse">Redirecting to Game...</h2>
        </div>
    );
};

export default PaymentCallbackPage;
