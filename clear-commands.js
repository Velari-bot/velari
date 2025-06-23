import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Error: DISCORD_TOKEN and CLIENT_ID must be set in your .env file.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// These are the specific server IDs where commands were previously deployed.
const guildIds = ['1381793479495127180', '1254224101342449694', '1384640904798802031'];

(async () => {
  try {
    console.log('Started clearing old server-specific (/) commands.');

    for (const guildId of guildIds) {
      try {
        console.log(`Clearing commands for guild: ${guildId}`);
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, guildId),
          { body: [] }, // Sending an empty array clears the commands
        );
        console.log(`✅ Successfully cleared commands for guild: ${guildId}`);
      } catch (err) {
        console.error(`Could not clear commands for guild ${guildId}:`, err);
      }
    }

    console.log('✅ Finished clearing all old server-specific commands.');
    console.log('Your global commands will now be the only ones visible. This may take a few minutes to update in Discord.');

  } catch (error) {
    console.error('An error occurred during the cleanup process:', error);
  }
})(); 