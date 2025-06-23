import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { permabannedIds } from './utils/permaban.js';
import { handleEmbedBuilderModal, handleEmbedButton } from './commands/embedbuilder.js';
import { antiSpam } from './utils/antiSpam.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

client.commands = new Collection();

// Channel IDs
const WELCOME_CHANNEL_ID = '1369435023899496498';
const RULES_CHANNEL_ID = '1369435178971172984';
const ANNOUNCEMENTS_CHANNEL_ID = '1369435271002591232';
const PRICING_CHANNEL_ID = '1382467465572913172';
const FAQ_CHANNEL_ID = '1382467481733435486';
const STATUS_CHANNEL_ID = '1382467501622821076';
const ORDER_HERE_CHANNEL_ID = '1382467920063496232';
const SHOWCASE_CHANNEL_ID = '1382467953789894677';
const PACKAGE_ADDON_CHANNEL_ID = '1382467968826478592';
const REVIEWS_CHANNEL_ID = '1382467982004846632';
const GENERAL_CHAT_ID = '1369436802837905458';
const TICKET_CHANNEL_ID = '1370521751456317531';
const ORDER_TRACKING_CHANNEL_ID = '1382468168509034647';
const LOGS_CHANNEL_ID = '1369444382390091927';

// Dynamically load commands from commands folder
const commandsPath = path.join(process.cwd(), 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guilds`);
  console.log(`Watching ${client.users.cache.size} users`);
  
  // Initialize Firebase and Key System
  try {
    const { testConnection, initializeKeySystem } = await import('./firebase/firebase.js');
    
    // Test Firebase connection
    const connectionTest = await testConnection();
    if (!connectionTest) {
      console.error('❌ Firebase connection failed. Key system may not work properly.');
    }
    
    // Initialize key system collections
    const keySystemInit = await initializeKeySystem();
    if (!keySystemInit) {
      console.error('❌ Key system initialization failed.');
    } else {
      console.log('🔑 Key system ready!');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase/Key system:', error);
  }
  
  const general = client.channels.cache.get(GENERAL_CHAT_ID);
  if (general) {
    const me = await general.guild.members.fetchMe();
    const perms = general.permissionsFor(me);
    if (!perms.has(['ManageMessages', 'ModerateMembers'])) {
      console.warn('⚠️ Bot is missing Manage Messages or Moderate Members permissions in #general!');
    }
  } else {
    console.warn('⚠️ #general channel not found for permissions check.');
  }
});

client.on('guildCreate', async (guild) => {
  console.log(`Joined a new guild: ${guild.name} (id: ${guild.id})`);

  const roleName = client.user.username;

  // Check if the role already exists
  let role = guild.roles.cache.find(r => r.name === roleName);

  if (!role) {
    try {
      // Create the role with specific permissions
      role = await guild.roles.create({
        name: roleName,
        color: '#0099ff', // You can choose a different color
        permissions: [
          PermissionsBitField.Flags.ManageRoles,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.BanMembers,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ViewChannel,
        ],
        reason: `Role for ${client.user.username} bot`,
      });
      console.log(`Created role: ${role.name} in guild: ${guild.name}`);
    } catch (error) {
      console.error(`Could not create role in ${guild.name}:`, error);
      return;
    }
  } else {
    console.log(`Role "${roleName}" already exists in guild: ${guild.name}`);
  }

  // Assign the role to the bot
  try {
    const member = await guild.members.fetch(client.user.id);
    if (member && role) {
      await member.roles.add(role);
      console.log(`Assigned role "${role.name}" to the bot in guild: ${guild.name}`);
    }
  } catch (error) {
    console.error(`Could not assign role to the bot in ${guild.name}:`, error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      
      await command.execute(interaction, client);
    }
    
    // Handle button interactions
    if (interaction.isButton()) {
      const { customId } = interaction;
      
      // Import modules
      const ticketModule = await import('./commands/ticket.js');
      const reactionRoleModule = await import('./commands/reactionrole.js');
      const suggestModule = await import('./commands/suggest.js');
      const redeemModule = await import('./commands/redeem.js');
      const myKeysModule = await import('./commands/mykeys.js');
      const keyDashboardModule = await import('./commands/keydashboard.js');
      const reviewModule = await import('./commands/review.js');
      const trackOrderModule = await import('./commands/trackorderpanel.js');
      const orderPanelModule = await import('./commands/orderpanel.js');
      const supportPanelModule = await import('./commands/supportpanel.js');
      const priceModule = await import('./commands/price.js');
      const portfolioModule = await import('./commands/portfolio.js');
      const createTicketPanelModule = await import('./commands/createticketpanel.js');
      
      if (customId.startsWith('create_ticket')) {
        await ticketModule.handleCreateTicket(interaction, client);
      } else if (customId === 'configure_ticket_panel') {
        await createTicketPanelModule.handleConfigurePanelButton(interaction);
      } else if (customId === 'add_ticket_questions') {
        await createTicketPanelModule.handleAddQuestionsButton(interaction);
      } else if (customId === 'post_ticket_panel') {
        await createTicketPanelModule.handlePostPanelButton(interaction, client);
      } else if (customId === 'close_ticket') {
        await ticketModule.handleCloseTicketButton(interaction, client);
      } else if (customId === 'track_order_button') {
        await trackOrderModule.handleTrackOrderButton(interaction, client);
      } else if (customId === 'open_order_ticket') {
        await orderPanelModule.handleCreateOrderTicket(interaction, client);
      } else if (customId === 'open_support_ticket') {
        await supportPanelModule.handleCreateSupportTicket(interaction, client);
      } else if (customId.startsWith('reactionrole_')) {
        await reactionRoleModule.handleReactionRoleButton(interaction, client);
      } else if (customId.startsWith('suggestion_')) {
        await suggestModule.handleSuggestionVote(interaction, client);
      } else if (customId.startsWith('redeem_')) {
        await redeemModule.handleRedeemButton(interaction, client);
      } else if (customId.startsWith('mykeys_')) {
        await myKeysModule.handleMyKeysButton(interaction, client);
      } else if (customId.startsWith('dashboard_')) {
        await keyDashboardModule.handleDashboardButton(interaction, client);
      } else if (customId.startsWith('review_')) {
        await reviewModule.handleReviewButton(interaction, client);
      } else if (customId.startsWith('price_')) {
        await priceModule.handlePriceButton(interaction, client);
      } else if (customId.startsWith('portfolio_')) {
        await portfolioModule.handlePortfolioButton(interaction, client);
      } else {
        console.log(`Unknown button interaction: ${customId}`);
      }
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      const { customId } = interaction;
      
      const keyDashboardModule = await import('./commands/keydashboard.js');
      
      if (customId.startsWith('dashboard_')) {
        await keyDashboardModule.handleDashboardSelect(interaction, client);
      } else {
        console.log(`Unknown select menu interaction: ${customId}`);
      }
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;
      
      // Import modules
      const ticketModule = await import('./commands/ticket.js');
      const utilityModule = await import('./commands/utility.js');
      const suggestModule = await import('./commands/suggest.js');
      const trackOrderModule = await import('./commands/trackorderpanel.js');
      const orderPanelModule = await import('./commands/orderpanel.js');
      const supportPanelModule = await import('./commands/supportpanel.js');
      const createTicketPanelModule = await import('./commands/createticketpanel.js');
      
      if (customId === 'ticket_modal') {
        await ticketModule.handleTicketModal(interaction, client);
      } else if (customId === 'ticket_panel_modal') {
        await createTicketPanelModule.handleTicketPanelModal(interaction, client);
      } else if (customId === 'ticket_questions_modal') {
        await createTicketPanelModule.handleQuestionsModal(interaction);
      } else if (customId === 'track_order_modal') {
        await trackOrderModule.handleTrackOrderModal(interaction, client);
      } else if (customId === 'order_ticket_modal') {
        await orderPanelModule.handleOrderTicketModal(interaction, client);
      } else if (customId === 'support_ticket_modal') {
        await supportPanelModule.handleSupportTicketModal(interaction, client);
      } else if (customId === 'announcement_modal') {
        await utilityModule.handleAnnouncementModal(interaction, client);
      } else if (customId === 'suggestion_modal') {
        await suggestModule.handleSuggestionModal(interaction, client);
      } else if (customId === 'embedbuilder_modal') {
        await handleEmbedBuilderModal(interaction, client);
        return;
      } else {
        console.log(`Unknown modal interaction: ${customId}`);
      }
    }

    // Handle embedbuilder button interactions
    if (interaction.isButton() && interaction.customId.startsWith('embed_')) {
      await handleEmbedButton(interaction, client);
      return;
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    // Check if it's an unknown interaction error (timeout)
    if (error.code === 10062) {
      console.log('Interaction timed out or was already handled, skipping error message');
      return;
    }
    
    const errorMessage = '❌ **An error occurred while processing your request.**';
    
    try {
      // Check if interaction is still valid
      if (!interaction.isRepliable()) {
        console.log('Interaction cannot be replied to, skipping error message');
        return;
      }
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      // Don't log if it's another unknown interaction error
      if (replyError.code !== 10062) {
        console.error('Error sending error message:', replyError);
      }
    }
  }
});

// --- Welcome Message with Random Emoji Reactions ---
const WELCOME_EMOJIS = [
  '🎉', '👋', '😎', '🥳', '✨', '🙌', '🔥', '😃', '🫡', '💫', '🤩', '🦾', '🦸', '🫶', '💥', '🌟', '🎊', '🕺', '💯', '🚀'
];

client.on('guildMemberAdd', async (member) => {
  try {
    const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel) return;

    // Format join date and account creation date
    const createdAt = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`;
    const joinedAt = `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`;

    // Get member count
    const memberCount = member.guild.memberCount;

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle(`🎉 Welcome to Lunary | EST 2024, ${member.user.tag}! 🎉`)
      .setDescription(`We're excited to have you join our community!\n\n• You are our **${memberCount}th** member\n• Account created on ${createdAt}\n• Join date: ${joinedAt}\n\n**Quick Links:**\n[Server Rules](https://discord.com/channels/${member.guild.id}/${RULES_CHANNEL_ID})\n[General](https://discord.com/channels/${member.guild.id}/)\n[Support](https://discord.com/channels/${member.guild.id}/)`)
      .setImage('attachment://Lunary_Banner.png')
      .setColor('#F44336')
      .setFooter({ text: `Member joined at • ${new Date(member.joinedTimestamp).toLocaleTimeString()} • ${new Date(member.joinedTimestamp).toLocaleDateString()}` });

    // Send embed with banner image attachment
    const sentMessage = await channel.send({
      embeds: [embed],
      files: [{ attachment: './Lunary_Banner.png', name: 'Lunary_Banner.png' }]
    });

    // Pick 3 random emojis
    const shuffled = WELCOME_EMOJIS.sort(() => 0.5 - Math.random());
    const emojis = shuffled.slice(0, 3);
    for (const emoji of emojis) {
      await sentMessage.react(emoji);
    }
  } catch (err) {
    console.error('Error sending welcome message:', err);
  }
});

client.on('guildMemberRemove', async member => {
  try {
    const welcomeModule = await import('./commands/welcome.js');
    await welcomeModule.sendGoodbyeMessage(member.guild, member, client);
  } catch (error) {
    console.error('Error handling member leave:', error);
  }
});

// Message deletion tracking for snipe command
client.on('messageDelete', async message => {
  try {
    if (message.author?.bot) return;
    
    const moderationModule = await import('./commands/moderation.js');
    moderationModule.storeDeletedMessage(client, message.channel.id, message);
  } catch (error) {
    console.error('Error tracking deleted message:', error);
  }
});

// --- Permaban System ---
client.on('guildMemberAdd', async member => {
  if (permabannedIds.has(member.id)) {
    try {
      await member.ban({ reason: 'Permanently banned by bot.' });
      await member.send('🚫 You are permanently banned from this server.');
    } catch {}
  }
});

// Handle new server joins
client.on('guildCreate', async (guild) => {
  try {
    console.log(`🎉 Bot added to new server: ${guild.name} (${guild.id})`);
    
    // Find a suitable channel to send the welcome message
    let welcomeChannel = null;
    
    // Try to find a general or announcements channel
    const channelTypes = ['general', 'announcements', 'welcome', 'chat', 'main'];
    for (const type of channelTypes) {
      const channel = guild.channels.cache.find(ch => 
        ch.type === 0 && // Text channel
        ch.permissionsFor(guild.members.me).has('SendMessages') &&
        (ch.name.toLowerCase().includes(type) || ch.name.toLowerCase().includes('general'))
      );
      if (channel) {
        welcomeChannel = channel;
        break;
      }
    }
    
    // If no suitable channel found, try the first text channel the bot can send messages to
    if (!welcomeChannel) {
      welcomeChannel = guild.channels.cache.find(ch => 
        ch.type === 0 && // Text channel
        ch.permissionsFor(guild.members.me).has('SendMessages')
      );
    }
    
    if (welcomeChannel) {
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('🎉 **Welcome to Velari Bot!**')
        .setColor('#4CAF50')
        .setDescription(`**Thank you for adding Velari to your server!**\n\n**To get started, you need to configure the bot for your server.**`)
        .addFields({
          name: '🔧 **Setup Required**',
          value: '**Use `/setup` to configure admin and staff roles:**\n\n• **Admin Role** - Full access to all bot features\n• **Staff Role** - Access to view orders and help with support\n• **Support Role** (optional) - Can manage tickets\n\n**Only users with "Manage Server" permission can run this command.**',
          inline: false
        })
        .addFields({
          name: '🚀 **Available Features**',
          value: '• **Order Management** - Track and manage orders\n• **Key System** - Generate and manage premium keys\n• **Ticket System** - Support ticket management\n• **Review System** - Customer review management\n• **Embed Builder** - Create custom embeds\n• **And much more!**',
          inline: false
        })
        .addFields({
          name: '📋 **Next Steps**',
          value: '1. **Run `/setup`** to configure roles\n2. **Run `/serverinfo`** to view current configuration\n3. **Start using the bot!**\n\n**Need help?** Check the bot\'s help commands or contact support.',
          inline: false
        })
        .setFooter({ text: 'Velari Bot - Multi-Server Ready', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [welcomeEmbed] });
    }
    
    // Log the new server
    console.log(`📝 New server added: ${guild.name} (${guild.id}) - Owner: ${guild.ownerId}`);
    
  } catch (error) {
    console.error('Error handling new server join:', error);
  }
});

// Handle server leaves
client.on('guildDelete', async (guild) => {
  try {
    console.log(`👋 Bot removed from server: ${guild.name} (${guild.id})`);
    
    // Clean up server configuration from Firebase
    try {
      const { db } = await import('./firebase/firebase.js');
      await db.collection('server_configs').doc(guild.id).delete();
      console.log(`🗑️ Cleaned up server config for: ${guild.name} (${guild.id})`);
    } catch (error) {
      console.error('Error cleaning up server config:', error);
    }
    
  } catch (error) {
    console.error('Error handling server leave:', error);
  }
});

client.login(process.env.DISCORD_TOKEN); 