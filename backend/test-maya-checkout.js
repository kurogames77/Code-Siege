import 'dotenv/config';
import axios from 'axios';

const testCheckout = async () => {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    console.log("Secret Key Loaded:", secretKey ? "YES" : "NO");

    const options = {
        method: 'POST',
        url: 'https://api.paymongo.com/v1/checkout_sessions',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
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
                            amount: 10000,
                            description: 'Gems Purchase',
                            name: 'Gem Pack',
                            quantity: 1
                        }
                    ],
                    payment_method_types: ['paymaya', 'gcash'],
                    billing: {
                        name: 'Test Customer',
                        email: 'customer@example.com',
                        phone: '09123456789'
                    },
                    success_url: 'http://localhost:5173/payment-callback?status=success',
                    cancel_url: 'http://localhost:5173/payment-callback?status=failed'
                }
            }
        }
    };

    try {
        console.log("Sending Checkout request to PayMongo...");
        const response = await axios.request(options);
        console.log("SUCCESS!");
        console.log("Session ID:", response.data.data.id);
        console.log("Checkout URL:", response.data.data.attributes.checkout_url);
    } catch (error) {
        console.error("FAILED!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error Message:", error.message);
        }
    }
};

testCheckout();
