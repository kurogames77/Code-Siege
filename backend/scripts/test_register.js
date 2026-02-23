import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const API_URL = 'http://localhost:3001/api/auth/register';

const testUser = {
    email: `test_student_${Date.now()}@example.com`,
    password: 'password123',
    username: `TestStu${Date.now()}`,
    student_id: `STU-${Date.now()}`,
    course: 'BSCS',
    role: 'student'
};

async function testRegistration() {
    console.log('Attempting registration with payload:', testUser);

    try {
        const response = await axios.post(API_URL, testUser);
        console.log('Registration successful:', response.data);

        // Check DB
        console.log('Checking database...');
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', testUser.email)
            .single();

        if (error) {
            console.error('Error fetching user from DB:', error);
        } else {
            console.log('User found in DB:', user);
            if (user.student_id === testUser.student_id) {
                console.log('✅ PASS: student_id was saved correctly.');
            } else {
                console.log('❌ FAIL: student_id is mismatch or null.');
                console.log(`Expected: ${testUser.student_id}, Got: ${user.student_id}`);
            }
        }

    } catch (error) {
        console.error('Registration failed:', error.response ? error.response.data : error.message);
    }
}

testRegistration();
