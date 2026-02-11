import express from 'express';
import axios from 'axios';

const router = express.Router();

// Create a PayMongo Link
router.post('/create-link', async (req, res) => {
    try {
        const { amount, description, remarks } = req.body;

        if (!amount || !description) {
            return res.status(400).json({ error: 'Amount and description are required' });
        }

        console.log("PayMongo Request:", { amount, description });
        console.log("Secret Key Loaded?", !!process.env.PAYMONGO_SECRET_KEY);
        if (process.env.PAYMONGO_SECRET_KEY) {
            console.log("Secret Key Start:", process.env.PAYMONGO_SECRET_KEY.substring(0, 5));
        } else {
            console.error("CRITICAL: PAYMONGO_SECRET_KEY is missing!");
            return res.status(500).json({ error: 'Server misconfiguration: Missing API Key' });
        }

        const options = {
            method: 'POST',
            url: 'https://api.paymongo.com/v1/links',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`
            },
            data: {
                data: {
                    attributes: {
                        amount: amount, // Amount in centavos
                        description: description,
                        remarks: remarks || 'Code Siege Gem Purchase',
                        redirect: {
                            success: req.body.successUrl || 'http://localhost:5173/payment-callback?status=success',
                            failed: req.body.cancelUrl || 'http://localhost:5173/payment-callback?status=failed'
                        },
                        checkout_methods: ['card', 'paymaya', 'gcash', 'grab_pay', 'dob']
                    }
                }
            }
        };

        const response = await axios.request(options);
        res.json(response.data);

    } catch (error) {
        console.error('PayMongo Link Creation Error:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: 'Failed to create payment link',
            details: error.response ? error.response.data : error.message
        });
    }
});

// Retrieve a PayMongo Link by ID
router.get('/link/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const options = {
            method: 'GET',
            url: `https://api.paymongo.com/v1/links/${id}`,
            headers: {
                accept: 'application/json',
                authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`
            }
        };

        const response = await axios.request(options);
        res.json(response.data);

    } catch (error) {
        console.error('PayMongo Retrieve Link Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to retrieve payment link' });
    }
});

// --------------------------------------------------------------------------
// MODERN FLOW: PAYMENT INTENTS (Recommended for GCash, Maya, etc.)
// --------------------------------------------------------------------------

// Create a Payment Intent + Attachment (Unified Flow for GCash & Maya)
router.post('/create-payment-intent', async (req, res) => {
    console.log("[TRACE] Endpoint Hit: /create-payment-intent");
    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
        console.error("CRITICAL: PAYMONGO_SECRET_KEY is missing!");
        return res.status(500).json({ error: 'Server misconfiguration: Missing API Key' });
    }

    const authHeader = `Basic ${Buffer.from(secretKey + ':').toString('base64')}`;

    try {
        const { amount, description, redirectUrls, paymentMethod } = req.body;
        // paymentMethod: 'gcash' or 'paymaya'

        if (!amount || !description || !paymentMethod) {
            return res.status(400).json({ error: 'Amount, description, and paymentMethod are required' });
        }

        if (!redirectUrls || !redirectUrls.success) {
            return res.status(400).json({ error: 'redirectUrls.success is required' });
        }

        const type = paymentMethod === 'maya' ? 'paymaya' : paymentMethod;

        // 1. Create Payment Intent
        console.log(`[TRACE] Intent: Creating for ${type}...`);
        const intentRes = await axios.post('https://api.paymongo.com/v1/payment_intents', {
            data: {
                attributes: {
                    amount: parseInt(amount),
                    payment_method_allowed: [type],
                    currency: 'PHP',
                    description: description
                }
            }
        }, { headers: { authorization: authHeader } });

        const intentId = intentRes.data.data.id;

        // 2. Create Payment Method
        console.log(`[TRACE] Intent: Creating Method for ${type}...`);
        const methodRes = await axios.post('https://api.paymongo.com/v1/payment_methods', {
            data: {
                attributes: {
                    type: type
                }
            }
        }, { headers: { authorization: authHeader } });

        const methodId = methodRes.data.data.id;

        // 3. Attach Payment Method to Intent
        console.log("[TRACE] Intent: Attaching Method...");
        const attachRes = await axios.post(`https://api.paymongo.com/v1/payment_intents/${intentId}/attach`, {
            data: {
                attributes: {
                    payment_method: methodId,
                    return_url: redirectUrls.success // Unified return URL for both success/fail
                }
            }
        }, { headers: { authorization: authHeader } });

        const attributes = attachRes.data.data.attributes;
        const nextAction = attributes.next_action;

        if (nextAction && nextAction.type === 'redirect') {
            console.log("[TRACE] Intent SUCCESS: Redirect URL generated");
            res.json({
                success: true,
                checkout_url: nextAction.redirect.url,
                payment_intent_id: intentId
            });
        } else {
            console.log("[TRACE] Intent: No redirect needed (state: " + attributes.status + ")");
            res.json({
                success: true,
                status: attributes.status,
                payment_intent_id: intentId
            });
        }

    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error('[TRACE] Payment Intent Error:', JSON.stringify(errorDetails, null, 2));
        res.status(500).json({
            error: 'Failed to create payment intent',
            details: errorDetails
        });
    }
});

// Create a PayMongo Checkout Session (Optimized for GCash Reliability)
router.post('/create-checkout-session', async (req, res) => {
    console.log("[TRACE] Endpoint Hit: /create-checkout-session");
    try {
        const { amount, description, successUrl, cancelUrl, method } = req.body;
        // method: 'gcash' (optional filter)

        if (!amount || !description) {
            return res.status(400).json({ error: 'Amount and description are required' });
        }

        if (!process.env.PAYMONGO_SECRET_KEY) {
            console.error("CRITICAL: PAYMONGO_SECRET_KEY is missing!");
            return res.status(500).json({ error: 'Server misconfiguration: Missing API Key' });
        }

        // Allow more methods to prevent "No payment methods available" error
        const paymentMethodTypes = ['gcash', 'paymaya', 'card', 'grab_pay', 'dob', 'billease'];

        const options = {
            method: 'POST',
            url: 'https://api.paymongo.com/v1/checkout_sessions',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`
            },
            data: {
                data: {
                    attributes: {
                        send_email_receipt: false,
                        show_description: true,
                        show_line_items: true,
                        line_items: [
                            {
                                currency: 'PHP',
                                amount: parseInt(amount),
                                description: description,
                                name: 'Gem Purchase',
                                quantity: 1
                            }
                        ],
                        payment_method_types: paymentMethodTypes,
                        description: description,
                        success_url: successUrl,
                        cancel_url: cancelUrl
                    }
                }
            }
        };

        console.log(`[TRACE] Creating Checkout Session for ${method || 'all'}...`);
        const response = await axios.request({ ...options, timeout: 10000 });
        console.log("[TRACE] Checkout Session Created:", response.data.data.id);
        res.json(response.data);

    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error('[TRACE] Checkout Session Error:', JSON.stringify(errorDetails, null, 2));
        res.status(500).json({
            error: 'Failed to create checkout session',
            details: errorDetails
        });
    }
});

// Removed deprecated Source Payment endpoint. Use /create-payment-intent instead.

// Retrieve a PayMongo Checkout Session by ID
router.get('/checkout-session/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const options = {
            method: 'GET',
            url: `https://api.paymongo.com/v1/checkout_sessions/${id}`,
            headers: {
                accept: 'application/json',
                authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`
            }
        };

        const response = await axios.request(options);
        res.json(response.data);

    } catch (error) {
        console.error('PayMongo Retrieve Session Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to retrieve checkout session' });
    }
});

// Retrieve a PayMongo Payment Intent by ID
router.get('/payment-intent/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const options = {
            method: 'GET',
            url: `https://api.paymongo.com/v1/payment_intents/${id}`,
            headers: {
                accept: 'application/json',
                authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`
            }
        };

        const response = await axios.request(options);
        res.json(response.data);

    } catch (error) {
        console.error('PayMongo Retrieve Intent Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to retrieve payment intent' });
    }
});

export default router;
