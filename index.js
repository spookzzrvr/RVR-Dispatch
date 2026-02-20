require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder,
} = require('discord.js');
const { REST } = require('@discordjs/rest');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ---- Load locations ----
const locationsPath = path.join(__dirname, 'locations.json');
let LOCATIONS = [];
try {
  LOCATIONS = JSON.parse(fs.readFileSync(locationsPath, 'utf8')).sort();
  if (!Array.isArray(LOCATIONS) || LOCATIONS.length === 0) throw new Error('locations.json leeg/ongeldig');
} catch (e) {
  console.error('❌ locations.json fout:', e.message);
  LOCATIONS = ['België', 'Nederland'];
}

const RVR_COLOR = '#E63D10';

const lengths = {
  kort: { label: 'Kort', distance: '0-400 km' },
  midden: { label: 'Midden', distance: '400-900 km' },
  lang: { label: 'Lang', distance: '900+ km' },
};

const trailerTypes = {
  standaard: 'Standaard (Box / Huif)',
  curtainsider: 'Huiftrailer (Curtainsider)',
  box: 'Gesloten trailer (Box)',
  ekeri: 'Ekeri / Volume',
  reefer: 'Koeltrailer (Reefer)',
  container: 'Container chassis',
  flatbed: 'Plateau (Flatbed)',
  lowbed: 'Dieplader (Lowbed)',
  tanker: 'Tank trailer',
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- Commands ----
const dispatchCommand = new SlashCommandBuilder()
  .setName('dispatch')
  .setDescription('Geef een chauffeur een RVR dispatch')

  // ✅ JOUW GEWENSTE VOLGORDE (allemaal required)
  .addUserOption(opt =>
    opt.setName('chauffeur')
      .setDescription('Tag de chauffeur die deze dispatch krijgt')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('land')
      .setDescription('Kies een land (autocomplete) of kies Random')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addStringOption(opt =>
    opt.setName('trailer')
      .setDescription('Welke trailer wil je rijden?')
      .setRequired(true)
      .addChoices(
        { name: 'Random', value: 'random' },
        { name: 'Standaard', value: 'standaard' },
        { name: 'Huif', value: 'curtainsider' },
        { name: 'Box', value: 'box' },
        { name: 'Ekeri', value: 'ekeri' },
        { name: 'Koel', value: 'reefer' },
        { name: 'Container', value: 'container' },
        { name: 'Plateau', value: 'flatbed' },
        { name: 'Dieplader', value: 'lowbed' },
        { name: 'Tank', value: 'tanker' }
      )
  )
  .addStringOption(opt =>
    opt.setName('lengte')
      .setDescription('Lengte van de rit')
      .setRequired(true)
      .addChoices(
        { name: 'Random', value: 'random' },
        { name: 'Kort', value: 'kort' },
        { name: 'Midden', value: 'midden' },
        { name: 'Lang', value: 'lang' }
      )
  );

const statusCommand = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Controleer of de RVR Dispatch Bot online is.');

const commands = [dispatchCommand, statusCommand];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );
  console.log('✅ Slash commands geregistreerd.');
})();

// ---- Interaction handler ----
client.on('interactionCreate', async (interaction) => {
  // Autocomplete for land
  if (interaction.isAutocomplete()) {
    if (interaction.commandName !== 'dispatch') return;

    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'land') return;

    const query = (focused.value || '').toString().toLowerCase().trim();

    // Voeg "Random" altijd toe als bovenste suggestie
    const suggestions = [];

    // Als user niks typt: zet Random + eerste 24 landen
    if (!query) {
      suggestions.push({ name: 'Random (willekeurig land)', value: '__random__' });
      LOCATIONS.slice(0, 24).forEach(l => suggestions.push({ name: l, value: l }));
      return interaction.respond(suggestions.slice(0, 25));
    }

    // Als user wél typt: Random alleen tonen als het matcht op "ran"
    if ('random'.includes(query) || 'willekeurig'.includes(query)) {
      suggestions.push({ name: 'Random (willekeurig land)', value: '__random__' });
    }

    const results = LOCATIONS
      .filter(l => l.toLowerCase().includes(query))
      .slice(0, 25 - suggestions.length)
      .map(l => ({ name: l, value: l }));

    return interaction.respond([...suggestions, ...results].slice(0, 25));
  }

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'status') {
    return interaction.reply('🟢 RVR Dispatch Bot is online en operationeel.');
  }

  if (interaction.commandName === 'dispatch') {
    const chauffeur = interaction.options.getUser('chauffeur');
    let land = interaction.options.getString('land');
    let trailer = interaction.options.getString('trailer');
    let lengte = interaction.options.getString('lengte');

    if (land === '__random__') land = pick(LOCATIONS);
    if (trailer === 'random') trailer = pick(Object.keys(trailerTypes));
    if (lengte === 'random') lengte = pick(Object.keys(lengths));

    const dispatchNumber = Math.floor(1000 + Math.random() * 9000);

    const embed = new EmbedBuilder()
      .setColor(RVR_COLOR)
      .setTitle('📻 RVR DISPATCH CENTRALE')
      .setDescription(`🔔 ${chauffeur}, u bent toegewezen aan dispatch **#${dispatchNumber}**.\nGelieve onderstaande rit uit te voeren.`)
      .addFields(
        { name: '📍 Vertrekland', value: `**${land}**`, inline: false },
        { name: '🚛 Trailer', value: trailerTypes[trailer], inline: true },
        { name: '📏 Afstand', value: `${lengths[lengte].label} — ${lengths[lengte].distance}`, inline: true }
      )
      .setFooter({ text: 'RVR Transport • ProMods & DLC • Veilig rijden staat voorop' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
// --- Express server voor Render (gratis Web Service fix) ---
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("RVR Dispatch Bot is running.");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server actief voor Render.");
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});