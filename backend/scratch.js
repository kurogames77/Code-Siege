import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { generateBlocksFromSolution } from './utils/blockGenerator.js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Starting universal patch for all towers...");
    const { data: levels, error } = await supabase.from('course_levels').select('*');
    if (error) { console.error(error); return; }
    
    let patched = 0;
    for (const level of levels) {
        let isBroken = false;
        
        let initialBlocksArray = level.initial_blocks;
        let correctSeqArray = level.correct_sequence || level.expected_output;

        // Try to unwrap double-stringified JSON payload if it is a string
        if (typeof initialBlocksArray === 'string') {
            try {
                const parsed = JSON.parse(initialBlocksArray);
                if (typeof parsed === 'string') {
                    initialBlocksArray = JSON.parse(parsed); // Double stringified
                } else {
                    initialBlocksArray = parsed;
                }
            } catch(e) {
                isBroken = true;
            }
        }
        
        if (typeof correctSeqArray === 'string') {
            try {
                const parsed = JSON.parse(correctSeqArray);
                if (typeof parsed === 'string') {
                    correctSeqArray = JSON.parse(parsed); // Double stringified
                } else {
                    correctSeqArray = parsed;
                }
            } catch(e) {
                isBroken = true;
            }
        }

        // Check if content is empty or structurally completely broken
        if (!initialBlocksArray || !Array.isArray(initialBlocksArray) || initialBlocksArray.length === 0) isBroken = true;
        if (!correctSeqArray || !Array.isArray(correctSeqArray) || correctSeqArray.length === 0) isBroken = true;
        
        // Final sanity check: if the first block looks wildly wrong, rewrite it
        if (!isBroken && initialBlocksArray.length > 0 && typeof initialBlocksArray[0] === 'string') isBroken = true;
                           
        if (isBroken && level.solution && level.solution.length > 5) {
            console.log(`Patching structurally broken level: ${level.id}`);
            const { initialBlocks, correctSequence } = generateBlocksFromSolution(level.solution);
            const { error: updateErr } = await supabase.from('course_levels')
                .update({ 
                    initial_blocks: initialBlocks, 
                    correct_sequence: correctSequence,
                    expected_output: correctSequence // update both just in case
                })
                .eq('id', level.id);
            if (updateErr) console.error(`Failed to patch level ${level.id}:`, updateErr);
            else patched++;
        } else if (!isBroken && (typeof level.initial_blocks === 'string' || typeof (level.correct_sequence || level.expected_output) === 'string')) {
            // It's not broken logic-wise, but it's stringified JSON inside a jsonb column
            // We should re-save it cleanly as pure unstringified JSON objects!
            console.log(`Cleaning double-stringified JSON for level: ${level.id}`);
            const { error: updateErr } = await supabase.from('course_levels')
                .update({ 
                    initial_blocks: initialBlocksArray, 
                    correct_sequence: correctSeqArray,
                    expected_output: correctSeqArray
                })
                .eq('id', level.id);
            if (updateErr) console.error(`Failed to clean level ${level.id}:`, updateErr);
            else patched++;
        }
    }
    console.log(`Successfully scanned and patched/cleaned ${patched} out of ${levels.length} total levels across all towers.`);
}
run();
