import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { TICKET_CONFIG, CHANNEL_IDS } from '../config.js';
import { db } from '../firebase/firebase.js';

export const data = new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome system')
    .addSubcommand(subcommand =>
        subcommand
            .setName('setchannel')
            .setDescription('Set the welcome channel')
            .addChannelOption(option =>
                option
                    .setName('channel')
                    .setDescription('Channel for welcome messages')
                    .setRequired(true)
                    .addChannelTypes(ChannelType.GuildText)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Toggle welcome features')
            .addStringOption(option =>
                option
                    .setName('feature')
                    .setDescription('Feature to toggle')
                    .setRequired(true)
                    .addChoices(
                        { name: 'DM Welcome', value: 'dm' },
                        { name: 'Welcome Messages', value: 'welcome' },
                        { name: 'Goodbye Messages', value: 'goodbye' }
                    )
            )
            .addBooleanOption(option =>
                option
                    .setName('enabled')
                    .setDescription('Enable or disable the feature')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('msgsetup')
            .setDescription('Set up a custom welcome message')
            .addStringOption(option =>
                option
                    .setName('server_name')
                    .setDescription('Custom server name to display')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('message')
                    .setDescription('Custom welcome message (use {user} for the new member)')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('logo_url')
                    .setDescription('URL of the logo image to display')
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
        // Default config
        const def = {
            channelId: null,
            dmEnabled: true,
            welcomeEnabled: true,
            goodbyeEnabled: true
        };
        client.welcomeConfig[guildId] = def;
        return def;
    }
}

export async function execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setchannel') {
        await handleSetChannel(interaction, client);
    } else if (subcommand === 'toggle') {
        await handleToggle(interaction, client);
    } else if (subcommand === 'msgsetup') {
        await handleMsgSetup(interaction, client);
    } else if (subcommand === 'test') {
        await handleTest(interaction, client);
    }
}

async function handleSetChannel(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return await interaction.reply({
            content: '❌ **You need "Manage Server" permission to configure the welcome system.**',
            ephemeral: true
        });
    }

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;
    const config = await loadWelcomeConfig(guildId, client);
    config.channelId = channel.id;
    await db.collection('welcomeConfig').doc(guildId).set(config);
    client.welcomeConfig[guildId] = config;

    const embed = new EmbedBuilder()
        .setTitle('✅ **Welcome Channel Set**')
        .setDescription(`**Welcome messages will now be sent to ${channel.toString()}**`)
        .setColor(TICKET_CONFIG.COLORS.SUCCESS)
        .setFooter({ text: 'Velari Welcome System', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleToggle(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return await interaction.reply({
            content: '❌ **You need "Manage Server" permission to configure the welcome system.**',
            ephemeral: true
        });
    }

    const feature = interaction.options.getString('feature');
    const enabled = interaction.options.getBoolean('enabled');
    const guildId = interaction.guildId;
    const config = await loadWelcomeConfig(guildId, client);

    switch (feature) {
        case 'dm':
            config.dmEnabled = enabled;
            break;
        case 'welcome':
            config.welcomeEnabled = enabled;
            break;
        case 'goodbye':
            config.goodbyeEnabled = enabled;
            break;
    }
    await db.collection('welcomeConfig').doc(guildId).set(config);
    client.welcomeConfig[guildId] = config;

    const embed = new EmbedBuilder()
        .setTitle('✅ **Welcome System Updated**')
        .setDescription(`**${feature.charAt(0).toUpperCase() + feature.slice(1)} messages are now ${enabled ? 'enabled' : 'disabled'}**`)
        .setColor(TICKET_CONFIG.COLORS.SUCCESS)
        .setFooter({ text: 'Velari Welcome System', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleMsgSetup(interaction, client) {
    try {
        await interaction.deferReply({ ephemeral: true });
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.editReply({
                content: '❌ **You need "Manage Server" permission to configure the welcome message.**',
                ephemeral: true
            });
        }
        const guildId = interaction.guildId;
        const config = await loadWelcomeConfig(guildId, client);
        const serverName = interaction.options.getString('server_name');
        const message = interaction.options.getString('message');
        const logoUrl = interaction.options.getString('logo_url');
        if (serverName) config.customServerName = serverName;
        if (message) config.customWelcomeMessage = message;
        if (logoUrl) config.customLogoUrl = logoUrl;
        await db.collection('welcomeConfig').doc(guildId).set(config);
        client.welcomeConfig[guildId] = config;
        const embed = new EmbedBuilder()
            .setTitle('✅ **Custom Welcome Message Set**')
            .setDescription('Your custom welcome message settings have been saved!')
            .setColor(TICKET_CONFIG.COLORS.SUCCESS)
            .setFooter({ text: 'Velari Welcome System', iconURL: interaction.guild.iconURL() })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        if (error.code === 10062) {
            // Unknown interaction, do not try to reply
            console.error('Interaction expired or unknown (msgsetup):', error.message);
        } else {
            console.error('Error in handleMsgSetup:', error);
        }
    }
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
        // Build the preview using the custom welcome message config
        const guild = interaction.guild;
        const member = interaction.member;
        const config = await loadWelcomeConfig(guild.id, client);
        if (!config || !config.customWelcomeMessage) {
            return await interaction.editReply({
                content: '❌ **No custom welcome message is set. Use `/welcome msgsetup` first.**',
                ephemeral: true
            });
        }
        const memberCount = guild.memberCount;
        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`;
        const joinDate = `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`;
        const quickLinks = `**Quick Links:**\n[Server Rules](https://discord.com/channels/${guild.id}/${CHANNEL_IDS.rules})\n[General](https://discord.com/channels/${guild.id}/${CHANNEL_IDS.generalChat})\n[Support](https://discord.com/channels/${guild.id}/${CHANNEL_IDS.ticket})`;
        const serverName = config.customServerName || guild.name;
        let welcomeMsg = config.customWelcomeMessage;
        welcomeMsg = welcomeMsg.replace('{user}', member.user.tag)
          .replace('{memberCount}', memberCount)
          .replace('{accountCreated}', accountCreated)
          .replace('{joinDate}', joinDate)
          .replace('{quickLinks}', quickLinks);
        const logoUrl = config.customLogoUrl || 'attachment://Lunary_Banner.png';
        const embed = new EmbedBuilder()
          .setTitle(`🎉 Welcome to ${serverName}, ${member.user.tag}! 🎉`)
          .setDescription(welcomeMsg)
          .setImage(logoUrl)
          .setColor('#F44336')
          .setFooter({ text: `Member joined at • ${new Date(member.joinedTimestamp).toLocaleTimeString()} • ${new Date(member.joinedTimestamp).toLocaleDateString()}` });
        await interaction.editReply({
            content: '👀 **Welcome Message Preview:** (Only you can see this)',
            embeds: [embed],
            files: logoUrl === 'attachment://Lunary_Banner.png' ? [{ attachment: './Lunary_Banner.png', name: 'Lunary_Banner.png' }] : [],
            ephemeral: true
        });
    } catch (error) {
        if (error.code === 10062) {
            // Unknown interaction, do not try to reply
            console.error('Interaction expired or unknown (test):', error.message);
        } else {
            console.error('Error in handleTest:', error);
        }
    }
}

const WELCOME_CHANNEL_ID = '1382038664246464523';
const RULES_CHANNEL_ID = '1382074001924427906';
const WELCOME_EMOJIS = [
  '🎉', '👋', '😎', '🥳', '✨', '🙌', '🔥', '😃', '🫡', '💫', '🤩', '🦾', '🦸', '🫶', '💥', '🌟', '🎊', '🕺', '💯', '🚀'
];

export async function sendWelcomeMessage(guild, member, client, isTest = false) {
    const config = await loadWelcomeConfig(guild.id, client);
    if (!config || !config.customWelcomeMessage) return; // Only send if custom message is set
    const memberCount = guild.memberCount;
    const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`;
    const joinDate = `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`;
    const quickLinks = `**Quick Links:**\n[Server Rules](https://discord.com/channels/${guild.id}/${RULES_CHANNEL_ID})\n[General](https://discord.com/channels/${guild.id}/)\n[Support](https://discord.com/channels/${guild.id}/)`;
    const serverName = config.customServerName || guild.name;
    let welcomeMsg = config.customWelcomeMessage;
    // Replace placeholders
    welcomeMsg = welcomeMsg.replace('{user}', member.user.tag)
      .replace('{memberCount}', memberCount)
      .replace('{accountCreated}', accountCreated)
      .replace('{joinDate}', joinDate)
      .replace('{quickLinks}', quickLinks);
    const logoUrl = config.customLogoUrl || 'attachment://Lunary_Banner.png';
    const embed = new EmbedBuilder()
      .setTitle(`🎉 Welcome to ${serverName}, ${member.user.tag}! 🎉`)
      .setDescription(welcomeMsg)
      .setImage(logoUrl)
      .setColor('#F44336')
      .setFooter({ text: `Member joined at • ${new Date(member.joinedTimestamp).toLocaleTimeString()} • ${new Date(member.joinedTimestamp).toLocaleDateString()}` });

    // Send to welcome channel with banner image attachment
    try {
        const channel = await guild.channels.fetch(config.channelId || CHANNEL_IDS.welcome);
        if (channel) {
            const sentMessage = await channel.send({
                embeds: [embed],
                files: logoUrl === 'attachment://Lunary_Banner.png' ? [{ attachment: './Lunary_Banner.png', name: 'Lunary_Banner.png' }] : []
            });
            // Add 3 random emoji reactions
            const shuffled = WELCOME_EMOJIS.sort(() => 0.5 - Math.random());
            const emojis = shuffled.slice(0, 3);
            for (const emoji of emojis) {
                await sentMessage.react(emoji);
            }
        }
    } catch (error) {
        console.error('Error sending welcome message to channel:', error);
    }

    // Send DM (unchanged)
    if (config.dmEnabled && !isTest) {
        try {
            await member.send({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error sending welcome DM:', error);
        }
    }
}

export async function sendGoodbyeMessage(guild, member, client) {
    const config = await loadWelcomeConfig(guild.id, client);
    if (!config || !config.goodbyeEnabled || !config.channelId) return;
    try {
        const channel = await guild.channels.fetch(config.channelId);
        if (!channel) return;
        const goodbyeEmbed = new EmbedBuilder()
            .setTitle('👋 **Goodbye!**')
            .setDescription(`**${member.user.tag} has left the server.**\n\n**We're sorry to see you go!**\n\n**Member count: ${guild.memberCount}**`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor(TICKET_CONFIG.COLORS.WARNING)
            .setFooter({ text: 'Velari Welcome System', iconURL: guild.iconURL() })
            .setTimestamp();
        await channel.send({ embeds: [goodbyeEmbed] });
    } catch (error) {
        console.error('Error sending goodbye message:', error);
    }
} 
