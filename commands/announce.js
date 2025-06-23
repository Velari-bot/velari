import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement DM to all users with a specific role.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option =>
        option.setName('role')
            .setDescription('The role to receive the announcement.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('message')
            .setDescription('The announcement message.')
            .setRequired(true));

export async function execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: 'You must be an administrator to use this command.',
            ephemeral: true,
        });
    }

    const role = interaction.options.getRole('role');
    const message = interaction.options.getString('message');

    await interaction.deferReply({ ephemeral: true });

    try {
        await interaction.guild.members.fetch();
        const members = role.members;

        if (members.size === 0) {
            return interaction.editReply('There are no members with that role.');
        }

        let successfulDMs = 0;
        let failedDMs = 0;

        for (const member of members.values()) {
            if (member.user.bot) {
                continue;
            }

            try {
                await member.send(message);
                successfulDMs++;
            } catch (error) {
                // This is expected if the user has DMs disabled or has blocked the bot.
                failedDMs++;
            }
        }

        await interaction.editReply(`Announcement sent to ${successfulDMs} members. Failed to send to ${failedDMs} members.`);

    } catch (error) {
        console.error('Error sending announcement:', error);
        await interaction.editReply('An error occurred while sending the announcement.');
    }
} 