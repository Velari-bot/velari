import { EmbedBuilder } from 'discord.js';
import { ANTI_SPAM_CONFIG as config } from '../anti-spam.config.js';

// Simple Levenshtein distance calculation for word similarity
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Calculate similarity percentage between two words
function calculateSimilarity(word1, word2) {
    const maxLength = Math.max(word1.length, word2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = levenshteinDistance(word1.toLowerCase(), word2.toLowerCase());
    return 1 - (distance / maxLength);
}

// Check if a word is similar to any banned word
function isWordSimilar(word, bannedWords) {
    for (const bannedWord of bannedWords) {
        const similarity = calculateSimilarity(word, bannedWord);
        if (similarity >= config.WORD_FILTER.SIMILARITY_THRESHOLD) {
            return { isSimilar: true, bannedWord, similarity };
        }
    }
    return { isSimilar: false };
}

// Check message content for banned words
function checkMessageContent(content) {
    if (!config.WORD_FILTER.ENABLED) return { hasViolation: false };
    
    const words = content.toLowerCase().split(/\s+/);
    const violations = [];
    
    for (const word of words) {
        // Clean the word (remove punctuation)
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length < 2) continue; // Skip very short words
        
        // Check for exact matches
        if (config.WORD_FILTER.BANNED_WORDS.includes(cleanWord)) {
            violations.push({
                word: cleanWord,
                type: 'exact',
                similarity: 1.0
            });
            continue;
        }
        
        // Check for similar words
        const similarityCheck = isWordSimilar(cleanWord, config.WORD_FILTER.BANNED_WORDS);
        if (similarityCheck.isSimilar) {
            violations.push({
                word: cleanWord,
                type: 'similar',
                bannedWord: similarityCheck.bannedWord,
                similarity: similarityCheck.similarity
            });
        }
    }
    
    return {
        hasViolation: violations.length > 0,
        violations
    };
}

// Apply punishment for word violations
async function applyWordViolationPunishment(message, violations) {
    const { member, author, guild } = message;
    
    try {
        if (config.WORD_FILTER.DELETE_MESSAGE) {
            await message.delete().catch(() => {});
        }
        
        let punishmentApplied = false;
        
        switch (config.WORD_FILTER.PUNISHMENT) {
            case 'timeout':
                await member.timeout(config.WORD_FILTER.TIMEOUT_DURATION, 'Word filter violation');
                punishmentApplied = true;
                break;
            case 'kick':
                await member.kick('Word filter violation');
                punishmentApplied = true;
                break;
            case 'ban':
                await member.ban({ reason: 'Word filter violation' });
                punishmentApplied = true;
                break;
            case 'delete':
                // Only delete message, no additional punishment
                break;
        }
        
        if (config.WORD_FILTER.LOG_VIOLATIONS) {
            await sendWordViolationLog(guild, author, violations, punishmentApplied);
        }
        
        return punishmentApplied;
    } catch (error) {
        console.error(`[Word Filter] Failed to punish ${author.tag}:`, error);
        return false;
    }
}

// Send word violation log
async function sendWordViolationLog(guild, author, violations, punishmentApplied) {
    if (!config.LOG_CHANNEL_ID) return;
    
    const logChannel = await guild.channels.fetch(config.LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel) return;
    
    const violationDetails = violations.map(v => {
        if (v.type === 'exact') {
            return `• **${v.word}** (exact match)`;
        } else {
            return `• **${v.word}** (similar to "${v.bannedWord}" - ${Math.round(v.similarity * 100)}% match)`;
        }
    }).join('\n');
    
    const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('🚫 Word Filter Violation')
        .addFields(
            { name: 'User', value: `${author.tag} (${author.id})` },
            { name: 'Action', value: punishmentApplied ? 
                `${config.WORD_FILTER.PUNISHMENT.charAt(0).toUpperCase() + config.WORD_FILTER.PUNISHMENT.slice(1)}` : 
                'Message Deleted Only' },
            { name: 'Violations', value: violationDetails },
            { name: 'Duration', value: config.WORD_FILTER.PUNISHMENT === 'timeout' ? 
                formatDuration(config.WORD_FILTER.TIMEOUT_DURATION) : 'N/A' }
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

export const wordFilter = {
    checkMessageContent,
    applyWordViolationPunishment
}; 