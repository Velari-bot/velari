import { Collection, EmbedBuilder } from 'discord.js';
import { ANTI_SPAM_CONFIG as config } from '../anti-spam.config.js';
import { wordFilter } from './wordFilter.js';
import { ipBan } from './ipBan.js';

const userCache = new Collection();

async function handleMessage(message) {
    if (!config.ENABLED || message.author.bot) return;

    // Check for ignored roles, channels, or users with admin permissions
    if (message.member.permissions.has('Administrator') || 
        config.IGNORED_CHANNELS.includes(message.channel.id) || 
        config.IGNORED_ROLES.some(roleId => message.member.roles.cache.has(roleId))) {
        return;
    }

    // Check for IP/user bans first
    const banCheck = ipBan.isUserBanned(message.author.id);
    if (banCheck.isBanned) {
        await ipBan.applyBanPunishment(message.member, banCheck.reason);
        return;
    }

    // Check for word filter violations
    const wordCheck = wordFilter.checkMessageContent(message.content);
    if (wordCheck.hasViolation) {
        await wordFilter.applyWordViolationPunishment(message, wordCheck.violations);
        return; // Don't process spam check if word filter already handled it
    }

    const now = Date.now();
    const userData = userCache.get(message.author.id) || {
        messageTimestamps: [],
        messageContents: [],
        offenseCount: 0,
        isPunished: false
    };

    // Add current message and filter out old ones
    userData.messageTimestamps.push(now);
    userData.messageContents.push(message.content);
    const recentTimestamps = userData.messageTimestamps.filter(ts => now - ts < config.TIMEFRAME);
    const recentContents = userData.messageContents.slice(-config.MESSAGE_LIMIT);

    userData.messageTimestamps = recentTimestamps;
    userData.messageContents = recentContents;
    userCache.set(message.author.id, userData);

    // Check for spam
    const isSpam = await detectSpam(userData, recentContents);
    if (isSpam && !userData.isPunished) {
        userData.isPunished = true;
        userData.offenseCount++;
        await applyPunishment(message, userData.offenseCount);
        
        // Prevent re-punishment for a short duration
        setTimeout(() => {
            userData.isPunished = false;
        }, 5000);
    }
}

async function detectSpam(userData, recentContents) {
    // Check for rapid messages
    if (userData.messageTimestamps.length > config.MESSAGE_LIMIT) {
        return true;
    }

    // Check for duplicate messages
    const uniqueMessages = new Set(recentContents);
    if ((recentContents.length - uniqueMessages.size) >= config.MAX_DUPLICATES) {
        return true;
    }

    return false;
}

async function applyPunishment(message, offenseCount) {
    const { member, author, guild } = message;
    const durationIndex = Math.min(offenseCount - 1, config.TIMEOUT_DURATIONS.length - 1);
    const duration = config.TIMEOUT_DURATIONS[durationIndex];
    const durationFormatted = formatDuration(duration);

    try {
        if (config.PUNISHMENT_TYPE === 'timeout') {
            await member.timeout(duration, 'Spamming');
        } else if (config.PUNISHMENT_TYPE === 'kick') {
            await member.kick('Spamming');
        } else if (config.PUNISHMENT_TYPE === 'ban') {
            await member.ban({ reason: 'Spamming' });
        }
        
        await sendLog(guild, author, offenseCount, durationFormatted);
        
        // Clean up user's recent messages
        const channelMessages = await message.channel.messages.fetch({ limit: 15 });
        const userSpam = channelMessages.filter(m => m.author.id === author.id);
        if (userSpam.size > 0) {
            await message.channel.bulkDelete(userSpam, true);
        }
    } catch (error) {
        console.error(`[Anti-Spam] Failed to punish ${author.tag}:`, error);
    }
}

async function sendLog(guild, author, offenseCount, durationFormatted) {
    if (!config.LOG_CHANNEL_ID) return;
    const logChannel = await guild.channels.fetch(config.LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚨 Spam Detected')
        .addFields(
            { name: 'User', value: `${author.tag} (${author.id})` },
            { name: 'Action', value: `${config.PUNISHMENT_TYPE.charAt(0).toUpperCase() + config.PUNISHMENT_TYPE.slice(1)}` },
            { name: 'Duration', value: durationFormatted },
            { name: 'Offense Count', value: `${offenseCount}` }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}

function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    
    return [
        hours > 0 ? `${hours} hour(s)` : null,
        minutes > 0 ? `${minutes} minute(s)` : null,
        seconds > 0 ? `${seconds} second(s)` : null,
    ].filter(Boolean).join(', ');
}

export const antiSpam = { handleMessage }; 