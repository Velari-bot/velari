import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { ANTI_SPAM_CONFIG as config } from '../anti-spam.config.js';
import { ipBan } from '../utils/ipBan.js';

export const data = new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Manage word filtering and IP banning system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('word')
            .setDescription('Manage word filter')
            .addStringOption(option =>
                option
                    .setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Add Word', value: 'add' },
                        { name: 'Remove Word', value: 'remove' },
                        { name: 'List Words', value: 'list' }
                    )
            )
            .addStringOption(option =>
                option
                    .setName('word')
                    .setDescription('Word to add or remove')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ip')
            .setDescription('Manage IP banning')
            .addStringOption(option =>
                option
                    .setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Ban IP', value: 'ban' },
                        { name: 'Unban IP', value: 'unban' },
                        { name: 'List IPs', value: 'list' }
                    )
            )
            .addStringOption(option =>
                option
                    .setName('ip')
                    .setDescription('IP address to ban or unban')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('user')
            .setDescription('Manage user banning')
            .addStringOption(option =>
                option
                    .setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Ban User', value: 'ban' },
                        { name: 'Unban User', value: 'unban' },
                        { name: 'List Users', value: 'list' }
                    )
            )
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('User to ban or unban')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Show filter system status')
    );

export async function execute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
            content: '❌ **You need Administrator permission to use this command.**',
            ephemeral: true
        });
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'word':
            await handleWordFilter(interaction);
            break;
        case 'ip':
            await handleIPBan(interaction);
            break;
        case 'user':
            await handleUserBan(interaction);
            break;
        case 'status':
            await handleStatus(interaction);
            break;
    }
}

async function handleWordFilter(interaction) {
    const action = interaction.options.getString('action');
    const word = interaction.options.getString('word');

    if (action !== 'list' && !word) {
        return await interaction.reply({
            content: '❌ **Please provide a word for this action.**',
            ephemeral: true
        });
    }

    switch (action) {
        case 'add':
            if (config.WORD_FILTER.BANNED_WORDS.includes(word.toLowerCase())) {
                return await interaction.reply({
                    content: `❌ **"${word}" is already in the banned words list.**`,
                    ephemeral: true
                });
            }
            config.WORD_FILTER.BANNED_WORDS.push(word.toLowerCase());
            await interaction.reply({
                content: `✅ **Added "${word}" to the banned words list.**`,
                ephemeral: true
            });
            break;

        case 'remove':
            const index = config.WORD_FILTER.BANNED_WORDS.indexOf(word.toLowerCase());
            if (index === -1) {
                return await interaction.reply({
                    content: `❌ **"${word}" is not in the banned words list.**`,
                    ephemeral: true
                });
            }
            config.WORD_FILTER.BANNED_WORDS.splice(index, 1);
            await interaction.reply({
                content: `✅ **Removed "${word}" from the banned words list.**`,
                ephemeral: true
            });
            break;

        case 'list':
            const embed = new EmbedBuilder()
                .setTitle('🚫 Banned Words List')
                .setDescription(config.WORD_FILTER.BANNED_WORDS.length > 0 ? 
                    config.WORD_FILTER.BANNED_WORDS.map(w => `• ${w}`).join('\n') : 
                    'No banned words configured.')
                .setColor('#FF6B35')
                .setFooter({ text: 'Word Filter System', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;
    }
}

async function handleIPBan(interaction) {
    const action = interaction.options.getString('action');
    const ip = interaction.options.getString('ip');

    if (action !== 'list' && !ip) {
        return await interaction.reply({
            content: '❌ **Please provide an IP address for this action.**',
            ephemeral: true
        });
    }

    switch (action) {
        case 'ban':
            ipBan.banIPAddress(ip);
            await interaction.reply({
                content: `✅ **Banned IP address: ${ip}**`,
                ephemeral: true
            });
            break;

        case 'unban':
            ipBan.unbanIPAddress(ip);
            await interaction.reply({
                content: `✅ **Unbanned IP address: ${ip}**`,
                ephemeral: true
            });
            break;

        case 'list':
            const banList = ipBan.getBanList();
            const embed = new EmbedBuilder()
                .setTitle('🚫 Banned IP Addresses')
                .setDescription(banList.bannedIPs.length > 0 ? 
                    banList.bannedIPs.map(ip => `• ${ip}`).join('\n') : 
                    'No banned IP addresses.')
                .setColor('#8B0000')
                .setFooter({ text: 'IP Ban System', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;
    }
}

async function handleUserBan(interaction) {
    const action = interaction.options.getString('action');
    const user = interaction.options.getUser('user');

    if (action !== 'list' && !user) {
        return await interaction.reply({
            content: '❌ **Please provide a user for this action.**',
            ephemeral: true
        });
    }

    switch (action) {
        case 'ban':
            ipBan.banUserById(user.id);
            await interaction.reply({
                content: `✅ **Banned user: ${user.tag} (${user.id})**`,
                ephemeral: true
            });
            break;

        case 'unban':
            ipBan.unbanUserById(user.id);
            await interaction.reply({
                content: `✅ **Unbanned user: ${user.tag} (${user.id})**`,
                ephemeral: true
            });
            break;

        case 'list':
            const banList = ipBan.getBanList();
            const embed = new EmbedBuilder()
                .setTitle('🚫 Banned Users')
                .setDescription(banList.bannedUserIds.length > 0 ? 
                    banList.bannedUserIds.map(id => `• <@${id}> (${id})`).join('\n') : 
                    'No banned users.')
                .setColor('#8B0000')
                .setFooter({ text: 'User Ban System', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;
    }
}

async function handleStatus(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Filter System Status')
        .addFields(
            { 
                name: 'Word Filter', 
                value: config.WORD_FILTER.ENABLED ? '✅ Enabled' : '❌ Disabled',
                inline: true 
            },
            { 
                name: 'IP Ban', 
                value: config.IP_BAN.ENABLED ? '✅ Enabled' : '❌ Disabled',
                inline: true 
            },
            { 
                name: 'Anti-Spam', 
                value: config.ENABLED ? '✅ Enabled' : '❌ Disabled',
                inline: true 
            },
            { 
                name: 'Banned Words', 
                value: `${config.WORD_FILTER.BANNED_WORDS.length} words`,
                inline: true 
            },
            { 
                name: 'Banned IPs', 
                value: `${config.IP_BAN.BANNED_IPS.length} IPs`,
                inline: true 
            },
            { 
                name: 'Banned Users', 
                value: `${config.IP_BAN.BANNED_USER_IDS.length} users`,
                inline: true 
            },
            {
                name: 'Word Filter Settings',
                value: `**Punishment:** ${config.WORD_FILTER.PUNISHMENT}\n**Similarity Threshold:** ${Math.round(config.WORD_FILTER.SIMILARITY_THRESHOLD * 100)}%\n**Delete Messages:** ${config.WORD_FILTER.DELETE_MESSAGE ? 'Yes' : 'No'}`,
                inline: false
            },
            {
                name: 'IP Ban Settings',
                value: `**Punishment:** ${config.IP_BAN.PUNISHMENT}\n**Log Violations:** ${config.IP_BAN.LOG_VIOLATIONS ? 'Yes' : 'No'}`,
                inline: false
            }
        )
        .setColor('#4CAF50')
        .setFooter({ text: 'Velari Filter System', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
} 