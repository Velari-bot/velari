# 🛡️ Velari Filter System

The Velari Bot now includes an advanced filtering system that combines anti-spam protection, word filtering, and IP-based banning to keep your server safe and clean.

## 📋 Features

### 🔤 Word Filtering System
- **Exact Word Matching**: Automatically detects and blocks banned words
- **Similarity Detection**: Uses Levenshtein distance algorithm to catch variations and misspellings
- **Configurable Threshold**: Adjustable similarity percentage (default: 80%)
- **Multiple Punishment Options**: Timeout, kick, ban, or just delete messages
- **Comprehensive Logging**: All violations are logged with detailed information

### 🌐 IP Banning System
- **User ID Banning**: Ban specific users by their Discord ID
- **IP Address Banning**: Ban users by their IP address (when available)
- **Automatic Detection**: Banned users are automatically punished when they join or send messages
- **Flexible Punishments**: Timeout, kick, or ban options

### 🚫 Anti-Spam Protection
- **Rate Limiting**: Prevents rapid message spam
- **Duplicate Detection**: Catches repeated identical messages
- **Tiered Punishments**: Escalating punishments for repeat offenders
- **Smart Ignoring**: Ignores administrators and specified roles/channels

## ⚙️ Configuration

### Anti-Spam Configuration (`anti-spam.config.js`)

```javascript
export const ANTI_SPAM_CONFIG = {
    // Master switch
    ENABLED: true,
    
    // Word Filtering
    WORD_FILTER: {
        ENABLED: true,
        BANNED_WORDS: ['solace', 'melt', 'solacing', 'melting'],
        SIMILARITY_THRESHOLD: 0.8, // 80% similarity
        PUNISHMENT: 'timeout', // 'timeout', 'kick', 'ban', 'delete'
        TIMEOUT_DURATION: 10 * 60 * 1000, // 10 minutes
        DELETE_MESSAGE: true,
        LOG_VIOLATIONS: true
    },
    
    // IP Banning
    IP_BAN: {
        ENABLED: true,
        BANNED_IPS: [], // Add IP addresses here
        BANNED_USER_IDS: [], // Add user IDs here
        PUNISHMENT: 'ban', // 'timeout', 'kick', 'ban'
        TIMEOUT_DURATION: 24 * 60 * 60 * 1000, // 24 hours
        LOG_VIOLATIONS: true
    }
};
```

## 🎮 Commands

### `/filter word`
Manage the word filtering system.

**Subcommands:**
- `add <word>` - Add a word to the banned list
- `remove <word>` - Remove a word from the banned list
- `list` - Show all banned words

**Examples:**
```
/filter word add solace
/filter word remove melt
/filter word list
```

### `/filter ip`
Manage IP address banning.

**Subcommands:**
- `ban <ip>` - Ban an IP address
- `unban <ip>` - Unban an IP address
- `list` - Show all banned IP addresses

**Examples:**
```
/filter ip ban 192.168.1.1
/filter ip unban 10.0.0.1
/filter ip list
```

### `/filter user`
Manage user banning.

**Subcommands:**
- `ban <user>` - Ban a user by ID
- `unban <user>` - Unban a user by ID
- `list` - Show all banned users

**Examples:**
```
/filter user ban @username
/filter user unban @username
/filter user list
```

### `/filter status`
Show the current status of all filtering systems.

## 🔧 Setup Instructions

### 1. Enable the System
The filtering system is enabled by default. You can disable individual components in the configuration file.

### 2. Configure Banned Words
Add words to the `BANNED_WORDS` array in the configuration:

```javascript
BANNED_WORDS: [
    'solace', 'melt', 'solacing', 'melting', 'solaced', 'melted',
    'solacer', 'melter', 'solaceful', 'meltable', 'solaceless', 'meltless'
]
```

### 3. Set Up Logging
Ensure your log channel ID is correctly set in the configuration:

```javascript
LOG_CHANNEL_ID: 'YOUR_LOG_CHANNEL_ID'
```

### 4. Configure Permissions
Make sure the bot has the following permissions:
- Manage Messages
- Moderate Members
- Kick Members
- Ban Members
- Send Messages
- Embed Links

## 📊 How It Works

### Word Similarity Detection
The system uses the Levenshtein distance algorithm to calculate similarity between words:

- **Exact Match**: 100% similarity (e.g., "solace" = "solace")
- **Similar Match**: ≥80% similarity (e.g., "solace" ≈ "solac3", "s0lace")
- **Configurable Threshold**: Adjust the similarity percentage in the config

### Message Processing Flow
1. **IP/User Check**: First checks if the user is banned by IP or user ID
2. **Word Filter**: Checks message content for banned words
3. **Anti-Spam**: Checks for spam patterns
4. **Punishment**: Applies appropriate punishment based on violation type

### Logging System
All violations are logged with detailed information:
- User information (tag, ID)
- Violation type and details
- Action taken
- Duration (for timeouts)
- Timestamp

## 🛠️ Advanced Configuration

### Customizing Similarity Threshold
```javascript
SIMILARITY_THRESHOLD: 0.8 // 80% - More strict
SIMILARITY_THRESHOLD: 0.6 // 60% - Less strict
```

### Different Punishments for Different Violations
```javascript
// Word filter violations
WORD_FILTER: {
    PUNISHMENT: 'timeout',
    TIMEOUT_DURATION: 10 * 60 * 1000 // 10 minutes
}

// IP ban violations
IP_BAN: {
    PUNISHMENT: 'ban' // Permanent ban
}
```

### Ignoring Specific Roles/Channels
```javascript
IGNORED_ROLES: ["ADMIN_ROLE_ID", "MODERATOR_ROLE_ID"],
IGNORED_CHANNELS: ["CHANNEL_ID_1", "CHANNEL_ID_2"]
```

## 🔍 Troubleshooting

### Common Issues

**Q: The word filter isn't working**
A: Check that `WORD_FILTER.ENABLED` is set to `true` and the bot has proper permissions.

**Q: Similar words aren't being caught**
A: Lower the `SIMILARITY_THRESHOLD` value (e.g., 0.6 for 60% similarity).

**Q: No logs are being sent**
A: Verify the `LOG_CHANNEL_ID` is correct and the bot can send messages to that channel.

**Q: IP banning isn't working**
A: IP banning requires IP address data. In a real implementation, you'd need to track user IPs through your own system.

### Performance Tips
- Keep the banned words list reasonable in size
- Use exact matches when possible (more efficient than similarity checks)
- Monitor log channels for false positives
- Regularly review and update banned lists

## 📝 Notes

- **Administrator Override**: Users with Administrator permissions are always ignored
- **Case Insensitive**: All word matching is case-insensitive
- **Punctuation Handling**: Punctuation is stripped from words before checking
- **Memory Based**: Banned lists are stored in memory and reset on bot restart
- **No Persistence**: For production use, consider adding database persistence for banned lists

## 🔄 Updates and Maintenance

### Adding New Banned Words
Use the `/filter word add` command or edit the configuration file directly.

### Monitoring Effectiveness
Regularly check the logs to see:
- Which words are being caught
- False positive rates
- User feedback about overly strict filtering

### Performance Monitoring
Monitor bot performance, especially with large banned word lists or high message volumes.

---

**Need help?** Check the bot's help commands or contact support for assistance with the filtering system. 