import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from 'discord.js';
import { TICKET_CONFIG } from '../config.js';

// Temporary storage for custom questions
const customQuestionsStore = new Map();

export const data = new SlashCommandBuilder()
    .setName('createticketpanel')
    .setDescription('Create a customizable ticket panel with custom questions')
    .addChannelOption(option =>
        option
            .setName('channel')
            .setDescription('Channel to post the ticket panel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
    );

export async function execute(interaction, client) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
            content: '❌ **You need the "Manage Channels" permission to create ticket panels.**',
            ephemeral: true
        });
    }
    
    // Store the channel ID for later use
    customQuestionsStore.set(interaction.user.id, { channelId: interaction.options.getChannel('channel').id, questions: [] });

    const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket Panel Configuration')
        .setDescription('Configure your ticket panel using the buttons below. You can also add custom questions for users to answer when creating a ticket.')
        .setColor(TICKET_CONFIG.COLORS.PRIMARY)
        .addFields(
            { name: 'Step 1: Configure Panel', value: 'Click "Configure Panel" to set the title, description, color, etc.' },
            { name: 'Step 2: Add Questions (Optional)', value: 'Click "Add/Edit Questions" to define up to 3 custom questions for the ticket modal.' },
            { name: 'Step 3: Post Panel', value: 'Once configured, click "Post Ticket Panel" to send it to the channel.' }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('configure_ticket_panel')
                .setLabel('Configure Panel')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('add_ticket_questions')
                .setLabel('Add/Edit Questions')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('post_ticket_panel')
                .setLabel('Post Ticket Panel')
                .setStyle(ButtonStyle.Success)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

export async function handleConfigurePanelButton(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('ticket_panel_modal')
        .setTitle(' Customize Ticket Panel');

    const titleInput = new TextInputBuilder()
        .setCustomId('panel_title')
        .setLabel('Panel Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g.,  Support Tickets')
        .setValue(' Support Tickets')
        .setRequired(true);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('panel_description')
        .setLabel('Panel Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe what users can expect...')
        .setValue('**Need help? Create a ticket and our support team will assist you!**')
        .setRequired(true);

    const buttonTextInput = new TextInputBuilder()
        .setCustomId('button_text')
        .setLabel('Button Text')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Create Ticket')
        .setValue(' Create Ticket')
        .setRequired(true);

    const colorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setLabel('Embed Color (Hex)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#FF6B9D')
        .setValue('#FF6B9D')
        .setRequired(true);
        
    const footerInput = new TextInputBuilder()
        .setCustomId('footer_text')
        .setLabel('Footer Text (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Velari Support')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(buttonTextInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(footerInput)
    );

    await interaction.showModal(modal);
}

export async function handleAddQuestionsButton(interaction) {
    const userData = customQuestionsStore.get(interaction.user.id);
    const currentQuestions = userData ? userData.questions : [];

    const modal = new ModalBuilder()
        .setCustomId('ticket_questions_modal')
        .setTitle('❓ Add Custom Questions');

    for (let i = 1; i <= 3; i++) {
        const questionInput = new TextInputBuilder()
            .setCustomId(`question_${i}`)
            .setLabel(`Question ${i} (Optional)`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`e.g., What is your order ID?`)
            .setValue(currentQuestions[i - 1] || '')
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(questionInput));
    }

    await interaction.showModal(modal);
}

export async function handleQuestionsModal(interaction) {
    const questions = [];
    for (let i = 1; i <= 3; i++) {
        const question = interaction.fields.getTextInputValue(`question_${i}`);
        if (question) {
            questions.push(question);
        }
    }

    const userData = customQuestionsStore.get(interaction.user.id);
    if (userData) {
        userData.questions = questions;
        customQuestionsStore.set(interaction.user.id, userData);
    }

    await interaction.reply({
        content: `✅ **Successfully saved ${questions.length} custom questions!**\n\nNow, click the "Configure Panel" button to finalize and post your ticket panel.`,
        ephemeral: true
    });
}

export async function handleTicketPanelModal(interaction, client) {
    // This modal no longer posts the panel directly. It just saves the data.
    const panelConfig = {
        title: interaction.fields.getTextInputValue('panel_title'),
        description: interaction.fields.getTextInputValue('panel_description'),
        buttonText: interaction.fields.getTextInputValue('button_text'),
        colorHex: interaction.fields.getTextInputValue('embed_color'),
        footerText: interaction.fields.getTextInputValue('footer_text'),
    };

    const userData = customQuestionsStore.get(interaction.user.id);
    if (userData) {
        userData.panelConfig = panelConfig;
        customQuestionsStore.set(interaction.user.id, userData);
    }

    await interaction.reply({
        content: `✅ **Panel configuration saved!**\n\n- You can now add questions or click "Post Ticket Panel" to finish.`,
        ephemeral: true,
    });
}

export async function handlePostPanelButton(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const userData = customQuestionsStore.get(interaction.user.id);
    if (!userData || !userData.panelConfig) {
        return interaction.editReply({ content: '❌ Error: You must configure the panel before posting. Please click "Configure Panel" first.' });
    }

    const { channelId, questions, panelConfig } = userData;
    const { title, description, buttonText, colorHex, footerText } = panelConfig;

    const targetChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!targetChannel) {
        return interaction.editReply({ content: '❌ Error: Could not find the target channel. Please check permissions and start over.' });
    }

    const color = colorHex.match(/^#[0-9A-F]{6}$/i) ? colorHex : TICKET_CONFIG.COLORS.PRIMARY;
    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
    if (footerText) embed.setFooter({ text: footerText, iconURL: interaction.guild.iconURL() });

    let customId = 'create_ticket_default';
    if (questions && questions.length > 0) {
        const customIdData = { q: questions };
        customId = `create_ticket_custom:${JSON.stringify(customIdData)}`;
        if (customId.length > 100) {
            return interaction.editReply({ content: '❌ Error: Custom questions are too long. Please shorten them and try again.' });
        }
    }

    const createButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(customId).setLabel(buttonText).setStyle(ButtonStyle.Primary)
    );

    try {
        await targetChannel.send({ embeds: [embed], components: [createButton] });
        await interaction.editReply({ content: `✅ **Custom ticket panel has been successfully created in ${targetChannel.toString()}!**` });
        customQuestionsStore.delete(interaction.user.id); // Clean up session
    } catch (error) {
        console.error('Error creating ticket panel:', error);
        await interaction.editReply({ content: '❌ **Failed to create ticket panel. Please check my permissions in the channel.**' });
    }
} 