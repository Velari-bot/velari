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
    LOG_CHANNEL_ID: '1369444382390091927', // Replace with your actual log channel ID

    // Word Filtering System
    WORD_FILTER: {
        ENABLED: true,
        BANNED_WORDS: [
            'solace', 'melt', 'solacing', 'melting', 'solaced', 'melted',
            'solacer', 'melter', 'solaceful', 'meltable', 'solaceless', 'meltless'
        ],
        SIMILARITY_THRESHOLD: 0.8, // 0.8 = 80% similarity to trigger
        PUNISHMENT: 'timeout', // 'timeout', 'kick', 'ban', 'delete'
        TIMEOUT_DURATION: 10 * 60 * 1000, // 10 minutes for word violations
        DELETE_MESSAGE: true,
        LOG_VIOLATIONS: true
    },

    // IP Banning System
    IP_BAN: {
        ENABLED: true,
        BANNED_IPS: [
            // Add banned IP addresses here
            // '192.168.1.1',
            // '10.0.0.1'
        ],
        BANNED_USER_IDS: [
            // Add banned user IDs here
            // '123456789012345678',
            // '987654321098765432'
        ],
        PUNISHMENT: 'ban', // 'timeout', 'kick', 'ban'
        TIMEOUT_DURATION: 24 * 60 * 60 * 1000, // 24 hours for IP violations
        LOG_VIOLATIONS: true
    }
}; 