require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder
} = require('discord.js');
const { REST } = require('@discordjs/rest');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📁 Laad landen uit locations.json
const locationsPath = path.join(__dirname, 'locations.json');
const LOCATIONS = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));

const lengths = {
  kort: { label: "Kort", distance: "0–400 km" },
  midden: { label: "Midden", distance: "400–900 km" },
  lang: { label: "Lang", distance: "900+ km" }
};

const trailerTypes = {
  standaard: "Standaard (Box / Huif)",
  curtainsider: "Huiftrailer (Curtainsider)",
  box: "Gesloten trailer (Box)",
  ekeri: "Ekeri / Volume",
  reefer: "Koeltrailer (Reefer)",
  container: "Container chassis",
  flatbed: "Plateau (Flatbed)",
  lowbed: "Dieplader (Lowbed)",
  tanker: "Tank trailer"
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 📌 Slash commands
const commands = [

  new SlashCommandBuilder()
    .setName('dispatch')
    .setDescription('Geef een chauffeur een RVR dispatch')
    .addUserOption(option =>
      option.setName('driver')
        .setDescription('Tag een chauffeur (optioneel)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('locatie')
        .setDescription('Typ een land (autocomplete) of laat leeg voor Random')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('lengte')
        .setDescription('Lengte van de rit')
        .setRequired(true)
        .addChoices(
          { name: 'Random', value: 'random' },
          { name: 'Kort (0–400 km)', value: 'kort' },
          { name: 'Midden (400–900 km)', value: 'midden' },
          { name: 'Lang (900+ km)', value: 'lang' }
        )
    )
    .addStringOption(option =>
      option.setName('trailer')
        .setDescription('Welke trailer wil je rijden?')
        .setRequired(true)
        .addChoices(
          { name: 'Random', value: 'random' },
          { name: 'Standaard', value: 'standaard' },
          { name: 'Huiftrailer', value: 'curtainsider' },
          { name: 'Gesloten', value: 'box' },
          { name: 'Ekeri / Volume', value: 'ekeri' },
          { name: 'Koeltrailer', value: 'reefer' },
          { name: 'Container', value: 'container' },
          { name: 'Plateau', value: 'flatbed' },
          { name: 'Dieplader', value: 'lowbed' },
          { name: 'Tank', value: 'tanker' }
        )
    ),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Controleer of de RVR Dispatch Bot online is.')
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// 📌 Registreer slash commands
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands.map(command => command.toJSON()) }
  );
  console.log("✅ Slash commands geregistreerd.");
})();

// 📌 Interaction handler
client.on('interactionCreate', async (interaction) => {

  // 🔎 Autocomplete
  if (interaction.isAutocomplete()) {
    if (interaction.commandName !== 'dispatch') return;

    const focusedValue = interaction.options.getFocused().toLowerCase();

    const filtered = LOCATIONS
      .filter(loc => loc.toLowerCase().includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map(loc => ({ name: loc, value: loc }))
    );
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  // 🟢 Status command
  if (interaction.commandName === 'status') {
    await interaction.reply("🟢 RVR Dispatch Bot is online en operationeel.");
    return;
  }

  // 🚛 Dispatch command
  if (interaction.commandName === 'dispatch') {

    const driver = interaction.options.getUser('driver');
    let locatie = interaction.options.getString('locatie');
    let lengte = interaction.options.getString('lengte');
    let trailer = interaction.options.getString('trailer');

    if (!locatie) locatie = pick(LOCATIONS);
    if (lengte === "random") lengte = pick(Object.keys(lengths));
    if (trailer === "random") trailer = pick(Object.keys(trailerTypes));

    const lengthInfo = lengths[lengte];
    const trailerText = trailerTypes[trailer];

    const intro = driver
      ? `${driver}, de dispatch heeft een opdracht voor je. Rij deze rit! 🚛`
      : `Nieuwe dispatch opdracht! 🚛`;

const dispatchNumber = Math.floor(1000 + Math.random() * 9000);

const embed = new EmbedBuilder()
  .setColor("#E63D10")
  .setTitle("📻 RVR DISPATCH CENTRALE")
  .setDescription(
    driver
      ? `🔔 ${driver}, u bent toegewezen aan dispatch **#${dispatchNumber}**.\nGelieve onderstaande rit uit te voeren.`
      : `🔔 Nieuwe dispatch aangemaakt.\nReferentie: **#${dispatchNumber}**`
  )
  .addFields(
    {
      name: "━━━━━━━━━━━━━━━━━━",
      value: "**Ritgegevens**",
      inline: false
    },
    { name: "📍 Vertrekland", value: `**${locatie}**`, inline: false },
    { name: "📏 Afstand", value: `${lengthInfo.label} — ${lengthInfo.distance}`, inline: true },
    { name: "🚛 Trailer", value: trailerText, inline: true }
  )
  .setFooter({
    text: "RVR Transport • ProMods & DLC • Veilig rijden staat voorop"
  })
  .setTimestamp();
  }
});

client.login(process.env.TOKEN);
