import 'dotenv/config';
import axios from 'axios';

const testLink = async () => {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    console.log("Secret Key Loaded:", secretKey ? "YES" : "NO");

    const options = {
        method: 'POST',
        url: 'https://api.paymongo.com/v1/links',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
        },
        data: {
            data: {
                attributes: {
                    amount: 20000,
                    description: 'Maya Test Gem Purchase'
                }
            }
        }
    };

    try {
        console.log("Sending Links request to PayMongo...");
        const response = await axios.request(options);
        console.log("SUCCESS!");
        console.log("Link ID:", response.data.data.id);
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

testLink();
