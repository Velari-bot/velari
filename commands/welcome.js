import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { TICKET_CONFIG, CHANNEL_IDS } from '../config.js';
import { db } from '../firebase/firebase.js';

export const data = new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome system')
    .addSubcommand(subcommand =>
        subcommand
            .setName('setup')
            .setDescription('Set up the welcome system')
            .addChannelOption(option =>
                option
                    .setName('welcome_channel')
                    .setDescription('Channel for welcome messages')
                    .setRequired(true)
            )
            .addChannelOption(option =>
                option
                    .setName('quicklink1_channel')
                    .setDescription('First quick link channel')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('quicklink1_name')
                    .setDescription('Name for first quick link')
                    .setRequired(false)
            )
            .addChannelOption(option =>
                option
                    .setName('quicklink2_channel')
                    .setDescription('Second quick link channel')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('quicklink2_name')
                    .setDescription('Name for second quick link')
                    .setRequired(false)
            )
            .addChannelOption(option =>
                option
                    .setName('quicklink3_channel')
                    .setDescription('Third quick link channel')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('quicklink3_name')
                    .setDescription('Name for third quick link')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('server_name')
                    .setDescription('Custom server name to display')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('logo_url')
                    .setDescription('URL of the logo image to display')
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option
                    .setName('autorole')
                    .setDescription('Role to auto-assign to new members')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('test')
            .setDescription('Test the welcome message')
    );

// Helper to load config from Firestore
async function loadWelcomeConfig(guildId, client) {
    if (!client.welcomeConfig) client.welcomeConfig = {};
    if (client.welcomeConfig[guildId]) return client.welcomeConfig[guildId];
    const doc = await db.collection('welcomeConfig').doc(guildId).get();
    if (doc.exists) {
        client.welcomeConfig[guildId] = doc.data();
        return doc.data();
    } else {
        // Default config (per server)
        const def = {
            channelId: null,
            customServerName: null,
            customLogoUrl: null,
            quickLinks: {},
            autoRoleId: null
        };
        client.welcomeConfig[guildId] = def;
        return def;
    }
}

export async function execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'setup') {
        await handleWelcomeSetup(interaction, client);
    } else if (subcommand === 'test') {
        await handleTest(interaction, client);
    }
}

async function handleWelcomeSetup(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return await interaction.reply({
            content: '❌ **You need "Manage Server" permission to set up the welcome system.**',
            ephemeral: true
        });
    }
    const guildId = interaction.guildId;
    const config = await loadWelcomeConfig(guildId, client);
    // Welcome channel
    const welcomeChannel = interaction.options.getChannel('welcome_channel');
    config.channelId = welcomeChannel.id;
    // Quick links
    config.quickLinks = {};
    for (let i = 1; i <= 3; i++) {
        const channel = interaction.options.getChannel(`quicklink${i}_channel`);
        const name = interaction.options.getString(`quicklink${i}_name`);
        if (channel) {
            config.quickLinks[`link${i}`] = {
                channelId: channel.id,
                name: name || `Quick Link ${i}`
            };
        }
    }
    // Server name
    const serverName = interaction.options.getString('server_name');
    if (serverName) config.customServerName = serverName;
    // Logo/banner
    const logoUrl = interaction.options.getString('logo_url');
    if (logoUrl) config.customLogoUrl = logoUrl;
    // Autorole
    const autorole = interaction.options.getRole('autorole');
    if (autorole) config.autoRoleId = autorole.id;
    await db.collection('welcomeConfig').doc(guildId).set(config);
    client.welcomeConfig[guildId] = config;
    // Build confirmation embed
    const embed = new EmbedBuilder()
        .setTitle('✅ **Welcome Setup Complete**')
        .setDescription('Welcome system has been set up!')
        .addFields(
            { name: 'Welcome Channel', value: `${welcomeChannel}`, inline: false },
            ...Object.values(config.quickLinks).map((link, idx) => ({
                name: `Quick Link ${idx + 1}`,
                value: `${link.name}: <#${link.channelId}>`,
                inline: false
            })),
            ...(serverName ? [{ name: 'Server Name', value: serverName, inline: false }] : []),
            ...(logoUrl ? [{ name: 'Logo/Banner', value: logoUrl, inline: false }] : []),
            ...(autorole ? [{ name: 'Autorole', value: `<@&${autorole.id}>`, inline: false }] : [])
        )
        .setColor(TICKET_CONFIG.COLORS.SUCCESS)
        .setFooter({ text: 'Velari Welcome System', iconURL: interaction.guild.iconURL() })
        .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTest(interaction, client) {
    try {
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.editReply({
                content: '❌ **You need "Manage Server" permission to test the welcome system.**',
                ephemeral: true
            });
        }
        const guild = interaction.guild;
        const member = interaction.member;
        const config = await loadWelcomeConfig(guild.id, client);
        if (!config) {
            return await interaction.editReply({
                content: '❌ **No welcome config is set. Use `/welcome setup` first.**',
                ephemeral: true
            });
        }
        const quickLinks = await buildQuickLinks(guild, config);
        const embed = await buildWelcomeEmbed({ guild, member, config, quickLinks });
        const logoUrl = config.customLogoUrl || 'attachment://Void Banner.png';
        try {
            await interaction.editReply({
                content: '👀 **Welcome Message Preview:** (Only you can see this)',
                embeds: [embed],
                files: logoUrl === 'attachment://Void Banner.png' ? [{ attachment: './Void Banner.png', name: 'Void Banner.png' }] : [],
                ephemeral: true
            });
        } catch (error) {
            // If already acknowledged, use followUp
            if (error.code === 40060 || error.message?.includes('already been acknowledged')) {
                await interaction.followUp({
                    content: '👀 **Welcome Message Preview:** (Only you can see this)',
                    embeds: [embed],
                    files: logoUrl === 'attachment://Void Banner.png' ? [{ attachment: './Void Banner.png', name: 'Void Banner.png' }] : [],
                    ephemeral: true
                });
            } else {
                throw error;
            }
        }
    } catch (error) {
        if (error.code === 10062) {
            console.error('Interaction expired or unknown (test):', error.message);
        } else {
            console.error('Error in handleTest:', error);
        }
    }
}

async function buildQuickLinks(guild, config) {
    // Use custom quick links if set and valid
    if (config.quickLinks && Object.keys(config.quickLinks).length > 0) {
        let out = '';
        // Only use link1, link2, link3 in order
        for (let i = 1; i <= 3; i++) {
            const link = config.quickLinks[`link${i}`];
            if (link && link.channelId && link.name) {
                out += `[${link.name}](https://discord.com/channels/${guild.id}/${link.channelId})\n`;
            }
        }
        if (out.trim().length > 0) {
            return `**Quick Links:**\n${out.trim()}`;
        }
    }
    // fallback to default
    const rulesId = config.quickLinks?.rules || CHANNEL_IDS.rules;
    const generalId = config.quickLinks?.general || CHANNEL_IDS.generalChat;
    const supportId = config.quickLinks?.support || CHANNEL_IDS.ticket;
    return `**Quick Links:**\n[Server Rules](https://discord.com/channels/${guild.id}/${rulesId})\n[General](https://discord.com/channels/${guild.id}/${generalId})\n[Support](https://discord.com/channels/${guild.id}/${supportId})`;
}

async function buildWelcomeEmbed({ guild, member, config, quickLinks }) {
    const serverName = config.customServerName || guild.name;
    const estYear = new Date().getFullYear();
    const memberCount = guild.memberCount;
    function ordinal(n) {
        const s = ["th", "st", "nd", "rd"], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    const accountCreated = member.user.createdAt;
    const joinDate = member.joinedAt;
    function formatDate(date) {
        return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    function formatTime(date) {
        return date.toLocaleTimeString('en-US');
    }
    // Card-style layout
    let quickLinksValue = quickLinks.trim();
    if (!quickLinksValue.startsWith('**Quick Links:**')) {
        quickLinksValue = `**Quick Links**\n${quickLinksValue}`;
    } else {
        quickLinksValue = quickLinksValue.replace('**Quick Links:**', '**Quick Links**');
    }
    const divider = '━━━━━━━━━━━━━━━━━━';
    const embed = new EmbedBuilder()
        .setTitle(`🎉 **Welcome to ${serverName} | EST ${estYear}, ${member.user.tag}!** 🎉`)
        .setDescription(
            `Welcome to the server! We're excited to have you join our community.\n\n${divider}\n` +
            `**• You are our \`${ordinal(memberCount)}\` member**\n` +
            `**• Account created:** \`${formatDate(accountCreated)}\`\n` +
            `**• Join date:** \`${formatDate(joinDate)}\`\n` +
            `${divider}\n\n${quickLinksValue}\n\n${divider}`
        )
        .setImage('attachment://Void Banner.png')
        .setColor('#8e44ec')
        .setFooter({ text: `Member joined at • ${formatTime(joinDate)} • ${formatDate(joinDate)}` });
    return embed;
}

export async function sendWelcomeMessage(guild, member, client, isTest = false) {
    const config = await loadWelcomeConfig(guild.id, client);
    if (!config) return;
    const quickLinks = await buildQuickLinks(guild, config);
    const embed = await buildWelcomeEmbed({ guild, member, config, quickLinks });
    const logoUrl = config.customLogoUrl || 'attachment://Void Banner.png';
    try {
        const channel = await guild.channels.fetch(config.channelId || CHANNEL_IDS.welcome);
        if (channel) {
            const sentMessage = await channel.send({
                embeds: [embed],
                files: logoUrl === 'attachment://Void Banner.png' ? [{ attachment: './Void Banner.png', name: 'Void Banner.png' }] : []
            });
            const WELCOME_EMOJIS = [
                '🎉', '👋', '😎', '🥳', '✨', '🙌', '🔥', '😃', '🫡', '💫', '🤩', '🦾', '🦸', '🫶', '💥', '🌟', '🎊', '🕺', '💯', '🚀'
            ];
            const shuffled = WELCOME_EMOJIS.sort(() => 0.5 - Math.random());
            const emojis = shuffled.slice(0, 3);
            for (const emoji of emojis) {
                await sentMessage.react(emoji);
            }
        }
    } catch (error) {
        console.error('Error sending welcome message to channel:', error);
    }
    if (config.autoRoleId && !isTest) {
        try {
            const memberRole = guild.roles.cache.get(config.autoRoleId);
            if (memberRole) await member.roles.add(memberRole);
        } catch (err) {
            console.error('Failed to auto-assign role:', err);
        }
    }
}

export { loadWelcomeConfig };
