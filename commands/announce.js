import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../firebase/firebase.js';

export const data = new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Manage announcements')
    .addSubcommand(subcommand =>
        subcommand
            .setName('send')
            .setDescription('Send an announcement DM to users with a specific role.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addRoleOption(option => 
                option.setName('role')
                    .setDescription('The role to receive the announcement.')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('The announcement message.')
                    .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('opt-out')
            .setDescription('Opt-out of receiving announcements from this bot.'));

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'send') {
        await handleSend(interaction);
    } else if (subcommand === 'opt-out') {
        await handleOptOut(interaction);
    }
}

async function handleSend(interaction) {
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

        const optOutSnapshot = await db.collection('announcement_opt_outs').get();
        const optOutIds = new Set(optOutSnapshot.docs.map(doc => doc.id));

        for (const member of members.values()) {
            if (member.user.bot || optOutIds.has(member.id)) {
                continue;
            }

            try {
                await member.send(message);
                successfulDMs++;
            } catch (error) {
                console.error(`Could not send DM to ${member.user.tag}.`);
                failedDMs++;
            }
        }

        await interaction.editReply(`Announcement sent to ${successfulDMs} members. Failed to send to ${failedDMs} members.`);

    } catch (error) {
        console.error('Error sending announcement:', error);
        await interaction.editReply('An error occurred while sending the announcement.');
    }
}

async function handleOptOut(interaction) {
    const userId = interaction.user.id;
    const userRef = db.collection('announcement_opt_outs').doc(userId);

    try {
        const doc = await userRef.get();
        if (doc.exists) {
            await userRef.delete();
            await interaction.reply({ content: 'You have opted back in to receiving announcements.', ephemeral: true });
        } else {
            await userRef.set({ opted_out: true });
            await interaction.reply({ content: 'You have opted out of receiving announcements.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error handling opt-out:', error);
        await interaction.reply({ content: 'An error occurred while updating your preferences.', ephemeral: true });
    }
} 