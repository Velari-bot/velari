import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../firebase/firebase.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Setup bot roles, permissions, and channels for this server')
  // Required role options
  .addRoleOption(option =>
    option.setName('admin_role')
      .setDescription('Role that will have admin permissions (can manage orders, keys, etc.)')
      .setRequired(true))
  .addRoleOption(option =>
    option.setName('staff_role')
      .setDescription('Role that will have staff permissions (can view orders, help with support)')
      .setRequired(true))
  // Required channel options
  .addChannelOption(option =>
    option.setName('welcome_channel')
      .setDescription('Channel for welcome messages')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('rules_channel')
      .setDescription('Channel for server rules')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('announcements_channel')
      .setDescription('Channel for announcements')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('pricing_channel')
      .setDescription('Channel for pricing info')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('faq_channel')
      .setDescription('Channel for FAQs')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('status_channel')
      .setDescription('Channel for status updates')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('order_here_channel')
      .setDescription('Channel for placing orders')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('showcase_channel')
      .setDescription('Channel for showcases')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('package_addon_channel')
      .setDescription('Channel for package addons')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('reviews_channel')
      .setDescription('Channel for reviews')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('general_channel')
      .setDescription('General chat channel')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('ticket_channel')
      .setDescription('Channel for tickets')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('order_tracking_channel')
      .setDescription('Channel for order tracking')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('logs_channel')
      .setDescription('Channel for logs')
      .setRequired(true))
  // Optional role options
  .addRoleOption(option =>
    option.setName('support_role')
      .setDescription('Role for support team members (can manage tickets)')
      .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction, client) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const adminRole = interaction.options.getRole('admin_role');
    const staffRole = interaction.options.getRole('staff_role');
    const supportRole = interaction.options.getRole('support_role');
    const welcomeChannel = interaction.options.getChannel('welcome_channel');
    const rulesChannel = interaction.options.getChannel('rules_channel');
    const announcementsChannel = interaction.options.getChannel('announcements_channel');
    const pricingChannel = interaction.options.getChannel('pricing_channel');
    const faqChannel = interaction.options.getChannel('faq_channel');
    const statusChannel = interaction.options.getChannel('status_channel');
    const orderHereChannel = interaction.options.getChannel('order_here_channel');
    const showcaseChannel = interaction.options.getChannel('showcase_channel');
    const packageAddonChannel = interaction.options.getChannel('package_addon_channel');
    const reviewsChannel = interaction.options.getChannel('reviews_channel');
    const generalChannel = interaction.options.getChannel('general_channel');
    const ticketChannel = interaction.options.getChannel('ticket_channel');
    const orderTrackingChannel = interaction.options.getChannel('order_tracking_channel');
    const logsChannel = interaction.options.getChannel('logs_channel');

    // Check if bot can manage these roles
    const botMember = interaction.guild.members.me;
    if (adminRole.position >= botMember.roles.highest.position) {
      return await interaction.editReply({
        content: '❌ **I cannot manage the admin role. It is higher than my highest role.**'
      });
    }
    if (staffRole.position >= botMember.roles.highest.position) {
      return await interaction.editReply({
        content: '❌ **I cannot manage the staff role. It is higher than my highest role.**'
      });
    }
    if (supportRole && supportRole.position >= botMember.roles.highest.position) {
      return await interaction.editReply({
        content: '❌ **I cannot manage the support role. It is higher than my highest role.**'
      });
    }

    // Save server configuration to Firebase
    const serverConfig = {
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      adminRoleId: adminRole.id,
      adminRoleName: adminRole.name,
      staffRoleId: staffRole.id,
      staffRoleName: staffRole.name,
      supportRoleId: supportRole ? supportRole.id : null,
      supportRoleName: supportRole ? supportRole.name : null,
      welcomeChannelId: welcomeChannel.id,
      rulesChannelId: rulesChannel.id,
      announcementsChannelId: announcementsChannel.id,
      pricingChannelId: pricingChannel.id,
      faqChannelId: faqChannel.id,
      statusChannelId: statusChannel.id,
      orderHereChannelId: orderHereChannel.id,
      showcaseChannelId: showcaseChannel.id,
      packageAddonChannelId: packageAddonChannel.id,
      reviewsChannelId: reviewsChannel.id,
      generalChannelId: generalChannel.id,
      ticketChannelId: ticketChannel.id,
      orderTrackingChannelId: orderTrackingChannel.id,
      logsChannelId: logsChannel.id,
      setupBy: interaction.user.id,
      setupByUsername: interaction.user.username,
      setupAt: new Date(),
      isActive: true
    };

    try {
      await db.collection('server_configs').doc(interaction.guild.id).set(serverConfig);
    } catch (error) {
      console.error('Error saving server config:', error);
      return await interaction.editReply({
        content: '❌ **Failed to save server configuration. Please try again.**'
      });
    }

    // Create success embed
    const embed = new EmbedBuilder()
      .setTitle('✅ **Server Setup Complete**')
      .setColor('#4CAF50')
      .setDescription(`**Your server has been configured successfully!**`)
      .addFields(
        { name: '👑 **Admin Role**', value: `${adminRole} (${adminRole.name})`, inline: true },
        { name: '👥 **Staff Role**', value: `${staffRole} (${staffRole.name})`, inline: true },
        { name: '🎫 **Support Role**', value: supportRole ? `${supportRole} (${supportRole.name})` : 'Not set', inline: true },
        { name: '📢 **Welcome Channel**', value: `${welcomeChannel}`, inline: true },
        { name: '📜 **Rules Channel**', value: `${rulesChannel}`, inline: true },
        { name: '📣 **Announcements**', value: `${announcementsChannel}`, inline: true },
        { name: '💸 **Pricing**', value: `${pricingChannel}`, inline: true },
        { name: '❓ **FAQ**', value: `${faqChannel}`, inline: true },
        { name: '📊 **Status**', value: `${statusChannel}`, inline: true },
        { name: '🛒 **Order Here**', value: `${orderHereChannel}`, inline: true },
        { name: '🌟 **Showcase**', value: `${showcaseChannel}`, inline: true },
        { name: '📦 **Package Addon**', value: `${packageAddonChannel}`, inline: true },
        { name: '⭐ **Reviews**', value: `${reviewsChannel}`, inline: true },
        { name: '💬 **General**', value: `${generalChannel}`, inline: true },
        { name: '🎟️ **Ticket**', value: `${ticketChannel}`, inline: true },
        { name: '🔍 **Order Tracking**', value: `${orderTrackingChannel}`, inline: true },
        { name: '📝 **Logs**', value: `${logsChannel}`, inline: true }
      )
      .addFields({
        name: '🔑 **What This Enables**',
        value: '• **Admin Role**: Full access to all bot features\n• **Staff Role**: Access to view orders, help with support\n• **Support Role**: Can manage tickets and provide support\n\n**The bot is now ready to use in your server!**',
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send a public message to the channel
    const publicEmbed = new EmbedBuilder()
      .setTitle('🎉 **Bot Setup Complete!**')
      .setColor('#4CAF50')
      .setDescription(`**The Velari bot has been successfully configured for this server!**\n\n**Roles and channels have been set up and the bot is ready to use.**`)
      .addFields(
        { name: '👑 **Admin Role**', value: adminRole.name, inline: true },
        { name: '👥 **Staff Role**', value: staffRole.name, inline: true },
        { name: '🎫 **Support Role**', value: supportRole ? supportRole.name : 'Not set', inline: true },
        { name: '📢 **Welcome Channel**', value: welcomeChannel.name, inline: true },
        { name: '📜 **Rules Channel**', value: rulesChannel.name, inline: true },
        { name: '📣 **Announcements**', value: announcementsChannel.name, inline: true },
        { name: '💸 **Pricing**', value: pricingChannel.name, inline: true },
        { name: '❓ **FAQ**', value: faqChannel.name, inline: true },
        { name: '📊 **Status**', value: statusChannel.name, inline: true },
        { name: '🛒 **Order Here**', value: orderHereChannel.name, inline: true },
        { name: '🌟 **Showcase**', value: showcaseChannel.name, inline: true },
        { name: '📦 **Package Addon**', value: packageAddonChannel.name, inline: true },
        { name: '⭐ **Reviews**', value: reviewsChannel.name, inline: true },
        { name: '💬 **General**', value: generalChannel.name, inline: true },
        { name: '🎟️ **Ticket**', value: ticketChannel.name, inline: true },
        { name: '🔍 **Order Tracking**', value: orderTrackingChannel.name, inline: true },
        { name: '📝 **Logs**', value: logsChannel.name, inline: true }
      )
      .setFooter({ text: 'Setup by ' + interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.channel.send({ embeds: [publicEmbed] });

  } catch (error) {
    console.error('Error in setup command:', error);
    await interaction.editReply({
      content: '❌ **An error occurred while setting up the server. Please try again.**'
    });
  }
} 