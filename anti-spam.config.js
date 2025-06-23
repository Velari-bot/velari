// anti-spam.config.js

export const ANTI_SPAM_CONFIG = {
    // Master switch for the anti-spam system
    ENABLED: true,

    // Roles and channels to ignore
    IGNORED_ROLES: ["1299135105524043850"], // Example: Admin role
    IGNORED_CHANNELS: [],

    // Spam thresholds
    MESSAGE_LIMIT: 20, // 20 messages...
    TIMEFRAME: 5000,   // ...in 5 seconds
    MAX_DUPLICATES: 4, // Max 4 identical messages in the timeframe

    // Punishment settings
    PUNISHMENT_TYPE: 'timeout', // 'timeout' or 'kick' or 'ban'
    
    // Tiered punishment durations (in milliseconds)
    // The bot will escalate punishment for repeat offenders
    TIMEOUT_DURATIONS: [
        60 * 1000,          // 1st offense: 1 minute
        5 * 60 * 1000,      // 2nd offense: 5 minutes
        30 * 60 * 1000,     // 3rd offense: 30 minutes
        2 * 60 * 60 * 1000, // 4th offense: 2 hours
    ],

    // Log channel for spam alerts
    LOG_CHANNEL_ID: '1369444382390091927' // Replace with your actual log channel ID
}; 