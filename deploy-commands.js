import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const commands = [];
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`Found ${commandFiles.length} command files:`, commandFiles);

for (const file of commandFiles) {
  try {
    const command = await import(`./commands/${file}`);
    if (command.data) {
      commands.push(command.data.toJSON());
      console.log(`✅ Loaded command: ${file}`);
    } else {
      console.log(`⚠️ Skipping ${file}: No data property`);
    }
  } catch (error) {
    console.log(`❌ Error loading ${file}: ${error.message}`);
    // Don't exit on individual command errors, just log them
    console.error(error);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands globally.`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands globally.`);
  } catch (error) {
    console.error('❌ Global command deployment failed:', error);
  }
})(); 