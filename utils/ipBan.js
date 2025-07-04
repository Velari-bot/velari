import { EmbedBuilder } from 'discord.js';
import { ANTI_SPAM_CONFIG as config } from '../anti-spam.config.js';

// Store IP addresses for users (in a real implementation, you'd get this from Discord's API or your own tracking)
const userIPs = new Map();

// Check if a user is banned by IP or user ID
function isUserBanned(userId) {
    if (!config.IP_BAN.ENABLED) return { isBanned: false };
    
    // Check banned user IDs
    if (config.IP_BAN.BANNED_USER_IDS.includes(userId)) {
        return { isBanned: true, reason: 'User ID banned' };
    }
    
    // Check if user's IP is banned (if we have IP data)
    const userIP = userIPs.get(userId);
    if (userIP && config.IP_BAN.BANNED_IPS.includes(userIP)) {
        return { isBanned: true, reason: 'IP address banned' };
    }
    
    return { isBanned: false };
}

// Add a user's IP address to tracking (this would be called when you have IP data)
function addUserIP(userId, ipAddress) {
    userIPs.set(userId, ipAddress);
}

// Ban a user by ID
function banUserById(userId) {
    if (!config.IP_BAN.BANNED_USER_IDS.includes(userId)) {
        config.IP_BAN.BANNED_USER_IDS.push(userId);
    }
}

// Ban an IP address
function banIPAddress(ipAddress) {
    if (!config.IP_BAN.BANNED_IPS.includes(ipAddress)) {
        config.IP_BAN.BANNED_IPS.push(ipAddress);
    }
}

// Unban a user by ID
function unbanUserById(userId) {
    const index = config.IP_BAN.BANNED_USER_IDS.indexOf(userId);
    if (index > -1) {
        config.IP_BAN.BANNED_USER_IDS.splice(index, 1);
    }
}

// Unban an IP address
function unbanIPAddress(ipAddress) {
    const index = config.IP_BAN.BANNED_IPS.indexOf(ipAddress);
    if (index > -1) {
        config.IP_BAN.BANNED_IPS.splice(index, 1);
    }
}

// Apply punishment for banned users
async function applyBanPunishment(member, reason) {
    try {
        switch (config.IP_BAN.PUNISHMENT) {
            case 'timeout':
                await member.timeout(config.IP_BAN.TIMEOUT_DURATION, reason);
                break;
            case 'kick':
                await member.kick(reason);
                break;
            case 'ban':
                await member.ban({ reason });
                break;
        }
        
        if (config.IP_BAN.LOG_VIOLATIONS) {
            await sendBanViolationLog(member.guild, member.user, reason);
        }
        
        return true;
    } catch (error) {
        console.error(`[IP Ban] Failed to punish ${member.user.tag}:`, error);
        return false;
    }
}

// Send ban violation log
async function sendBanViolationLog(guild, user, reason) {
    if (!config.LOG_CHANNEL_ID) return;
    
    const logChannel = await guild.channels.fetch(config.LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel) return;
    
    const embed = new EmbedBuilder()
        .setColor('#8B0000')
        .setTitle('🚫 Banned User Detected')
        .addFields(
            { name: 'User', value: `${user.tag} (${user.id})` },
            { name: 'Action', value: `${config.IP_BAN.PUNISHMENT.charAt(0).toUpperCase() + config.IP_BAN.PUNISHMENT.slice(1)}` },
            { name: 'Reason', value: reason },
            { name: 'Duration', value: config.IP_BAN.PUNISHMENT === 'timeout' ? 
                formatDuration(config.IP_BAN.TIMEOUT_DURATION) : 'Permanent' }
        )
        .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
}

function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    return [
        days > 0 ? `${days} day(s)` : null,
        hours > 0 ? `${hours} hour(s)` : null,
        minutes > 0 ? `${minutes} minute(s)` : null,
        seconds > 0 ? `${seconds} second(s)` : null,
    ].filter(Boolean).join(', ');
}

// Get list of banned users and IPs
function getBanList() {
    return {
        bannedUserIds: [...config.IP_BAN.BANNED_USER_IDS],
        bannedIPs: [...config.IP_BAN.BANNED_IPS],
        trackedIPs: Object.fromEntries(userIPs)
    };
}

export const ipBan = {
    isUserBanned,
    addUserIP,
    banUserById,
    banIPAddress,
    unbanUserById,
    unbanIPAddress,
    applyBanPunishment,
    getBanList
}; 