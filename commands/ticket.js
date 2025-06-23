import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { TICKET_CONFIG } from '../config.js';
import { isValidTicketChannel } from '../utils/ticketUtils.js';
import { db } from '../firebase/firebase.js';
import { hasSupportPermission, getSupportRole, isServerConfigured } from '../utils/serverRoles.js';

// Helper to load ticket config from Firestore
async function loadTicketConfig(guildId, client) {
    if (!client.ticketConfig) client.ticketConfig = {};
    if (client.ticketConfig[guildId]) return client.ticketConfig[guildId];
    if (!db) {
        // Fallback if Firebase is not initialized
        const def = { ticketLogChannelId: null };
        client.ticketConfig[guildId] = def;
        return def;
    }
    const doc = await db.collection('ticketConfig').doc(guildId).get();
    if (doc.exists) {
        client.ticketConfig[guildId] = doc.data();
        return doc.data();
    } else {
        // Default config
        const def = {
            ticketLogChannelId: null
        };
        client.ticketConfig[guildId] = def;
        return def;
    }
}

function generateOrderId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export const data = new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the ticket system')
    .addSubcommand(subcommand =>
        subcommand
            .setName('close')
            .setDescription('Close the current ticket')
    );

export async function execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'close') {
        await handleCloseTicket(interaction, client);
    }
}

async function handleCloseTicket(interaction, client) {
    const channel = interaction.channel;
    const user = interaction.user;

    if (!isValidTicketChannel(channel.name)) {
        return await interaction.reply({
            content: '❌ **This command can only be used in ticket channels.**',
            ephemeral: true
        });
    }

    if (!await isServerConfigured(interaction.guild.id)) {
        return await interaction.reply({
            content: '❌ **This server has not been configured yet. Please use `/setup` to configure the bot first.**',
            ephemeral: true
        });
    }

    const hasPermission = await hasSupportPermission(interaction.member);
    const ticketCreatorId = channel.topic?.split('User ID: ')[1];
    if (!hasPermission && user.id !== ticketCreatorId) {
         return await interaction.reply({
            content: '❌ **You do not have permission to close tickets.**',
            ephemeral: true
        });
    }

    const confirmEmbed = new EmbedBuilder()
        .setTitle(TICKET_CONFIG.MESSAGES.CLOSING_TITLE)
        .setDescription(TICKET_CONFIG.MESSAGES.CLOSING_DESCRIPTION.replace('{user}', user.tag))
        .setColor(TICKET_CONFIG.COLORS.PRIMARY)
        .setFooter({ text: 'Velari Support System', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

    await interaction.reply({
        embeds: [confirmEmbed]
    });

    setTimeout(async () => {
        try {
            await channel.delete();
        } catch (error) {
            console.error('Error deleting ticket channel:', error);
        }
    }, TICKET_CONFIG.CLOSE_DELAY);
}

export async function handleCreateTicket(interaction, client) {
    const { customId } = interaction;
    let questions = [];
    let modalCustomId = 'ticket_modal_default';

    if (customId.startsWith('create_ticket_custom:')) {
        try {
            const jsonData = customId.substring('create_ticket_custom:'.length);
            const data = JSON.parse(jsonData);
            if (data.q && Array.isArray(data.q)) {
                questions = data.q;
                modalCustomId = `ticket_modal_custom:${jsonData}`;
            }
        } catch (error) {
            console.error('Error parsing custom ticket questions:', error);
        }
    }

    const modal = new ModalBuilder()
        .setCustomId(modalCustomId)
        .setTitle('📝 New Ticket');

    if (questions.length > 0) {
        questions.slice(0, 5).forEach((q, i) => {
            const questionInput = new TextInputBuilder()
                .setCustomId(`custom_question_${i}`)
                .setLabel(q)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(questionInput));
        });
    } else {
        const serviceInput = new TextInputBuilder()
            .setCustomId('ticket_service')
            .setLabel('Service (e.g., Bot, Website, GFX)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Describe your issue or request')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
            
        modal.addComponents(
            new ActionRowBuilder().addComponents(serviceInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        );
    }

    await interaction.showModal(modal);
}

export async function handleTicketModal(interaction, client) {
    const { customId, fields, guild, user } = interaction;
    let embedFields = [];

    await interaction.deferReply({ ephemeral: true });

    if (!await isServerConfigured(guild.id)) {
        return await interaction.editReply({
            content: '❌ **This server has not been configured yet. Please use `/setup` to configure the bot first.**',
            ephemeral: true
        });
    }

    if (customId.startsWith('ticket_modal_custom:')) {
        try {
            const jsonData = customId.substring('ticket_modal_custom:'.length);
            const data = JSON.parse(jsonData);
            if (data.q && Array.isArray(data.q)) {
                data.q.slice(0, 5).forEach((question, i) => {
                    const answer = fields.getTextInputValue(`custom_question_${i}`);
                    embedFields.push({ name: question, value: answer });
                });
            }
        } catch (error) {
            console.error('Error parsing custom ticket modal data:', error);
            embedFields.push({ name: 'Error', value: 'Could not parse custom questions.' });
        }
    } else {
        const service = fields.getTextInputValue('ticket_service');
        const description = fields.getTextInputValue('ticket_description');
        embedFields.push({ name: 'Service', value: service });
        embedFields.push({ name: 'Description', value: description });
    }

    const orderId = generateOrderId();
    
    const channelName = `ticket-${user.username.substring(0, 25)}`;
    let ticketChannel;
    
    try {
        const supportRole = await getSupportRole(guild);
        
        const permissionOverwrites = [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] }
        ];

        if (supportRole) {
            permissionOverwrites.push({
                id: supportRole.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
            });
        }

        ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: permissionOverwrites,
            topic: `Order ID: ${orderId} | Ticket for ${user.tag} | User ID: ${user.id}`
        });
    } catch (err) {
        console.error('Failed to create ticket channel:', err);
        return interaction.editReply({ content: '❌ Failed to create ticket channel. Please contact an admin.', ephemeral: true });
    }

    const supportRole = await getSupportRole(guild);
    const supportTag = supportRole ? `<@&${supportRole.id}>` : '';
    const userTag = `<@${user.id}>`;
    const embed = new EmbedBuilder()
        .setTitle('🎫 New Ticket Created')
        .setDescription(`A staff member will be with you shortly.`)
        .setColor('#57F287')
        .addFields(embedFields) 
        .setFooter({ text: `Order ID: ${orderId}` })
        .setTimestamp();
        
    const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket_button')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
    );
    
    await ticketChannel.send({ content: `${userTag} ${supportTag}`, embeds: [embed], components: [closeButton] });

    if (db) {
        const service = embedFields.find(f => f.name === 'Service')?.value || 'Custom Ticket';
        const description = embedFields.find(f => f.name === 'Description')?.value || 'See details in ticket channel.';

        await db.collection('orders').add({
            orderId,
            guildId: guild.id,
            userId: user.id,
            username: user.tag,
            channelId: ticketChannel.id,
            service,
            description,
            fields: embedFields,
            status: 'Pending',
            timestamp: new Date()
        });
    }

    try {
        await user.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle('📝 Ticket Created')
                    .setDescription(`Thank you for creating a ticket!\n\n**Order ID:** \`${orderId}\`\n\nYou can view your ticket in ${ticketChannel.toString()}`)
                    .setColor('#43B581')
                    .setFooter({ text: guild.name })
                    .setTimestamp()
            ]
        });
    } catch (err) {
    }

    const config = await loadTicketConfig(guild.id, client);
    if (config.ticketLogChannelId) {
        try {
            const logChannel = await guild.channels.fetch(config.ticketLogChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('Ticket Created')
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                    .setColor('#57F287')
                    .addFields(
                        { name: 'User', value: user.toString(), inline: true },
                        { name: 'Channel', value: ticketChannel.toString(), inline: true },
                        ...embedFields
                    )
                    .setFooter({ text: `User ID: ${user.id} | Order ID: ${orderId}` })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (err) {
        }
    }

    await interaction.editReply({ content: `✅ Your ticket has been created! ${ticketChannel.toString()}`, ephemeral: true });
}

export async function handleCloseTicketButton(interaction, client) {
    await handleCloseTicket(interaction, client);
}