import 'dotenv/config';
import axios from 'axios';

const testSource = async () => {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    console.log("Secret Key Loaded:", secretKey ? "YES" : "NO");
    if (secretKey) console.log("Starts with:", secretKey.substring(0, 7));

    const options = {
        method: 'POST',
        url: 'https://api.paymongo.com/v1/sources',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
        },
        data: {
            data: {
                attributes: {
                    amount: 10000,
                    type: 'gcash',
                    currency: 'PHP',
                    redirect: {
                        success: 'http://localhost:5173/success',
                        failed: 'http://localhost:5173/failed'
                    }
                }
            }
        }
    };

    try {
        console.log("Sending request to PayMongo...");
        const response = await axios.request(options);
        console.log("SUCCESS!");
        console.log("Source ID:", response.data.data.id);
        console.log("Checkout URL:", response.data.data.attributes.redirect.checkout_url);
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

testSource();
