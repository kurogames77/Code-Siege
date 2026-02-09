import { supabaseService, supabase as supabaseAnon } from '../lib/supabase.js';

// Use service role client if available (bypasses RLS), otherwise anon client
const supabase = supabaseService || supabaseAnon;

export const logger = {
    info: async (source, message, metadata = {}) => {
        await log('INFO', source, message, metadata);
    },
    warn: async (source, message, metadata = {}) => {
        await log('WARN', source, message, metadata);
    },
    error: async (source, message, metadata = {}) => {
        await log('ERROR', source, message, metadata);
    }
};

const log = async (level, source, message, metadata) => {
    try {
        // We do not await this to prevent blocking the main request flow
        supabase
            .from('system_logs')
            .insert({
                level,
                source,
                message,
                metadata
            })
            .then(({ error }) => {
                if (error) console.error('[Logger] Failed to save log:', error);
            });

        // Also log to console for dev visibility
        const timestamp = new Date().toISOString();
        if (level === 'ERROR') {
            console.error(`[${timestamp}] [${level}] [${source}] ${message}`, metadata);
        } else {
            console.log(`[${timestamp}] [${level}] [${source}] ${message}`, metadata);
        }
    } catch (err) {
        console.error('[Logger] Unexpected error:', err);
    }
};

export default logger;
