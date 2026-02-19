require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder
} = require('discord.js');
const { REST } = require('@discordjs/rest');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/**
 * PRO-MODS / DLC friendly:
 * - Users kiezen "regio" (of Random heel Europa)
 * - Bot kiest random land uit die regio (of uit alles)
 * - Users kiezen lengte + trailer type (i.p.v. cargo)
 */

// ✅ Regio's (dropdown blijft klein, landenlijst mag groot)
const regions = {
  "Benelux": ["België", "Nederland", "Luxemburg"],
  "UK & Ierland": ["Verenigd Koninkrijk", "Ierland"],
  "Frankrijk": ["Frankrijk", "Monaco"],
  "Iberia": ["Spanje", "Portugal", "Andorra", "Gibraltar"],
  "Italië": ["Italië", "San Marino", "Vaticaanstad"],
  "DACH": ["Duitsland", "Oostenrijk", "Zwitserland", "Liechtenstein"],
  "Scandinavië": ["Denemarken", "Noorwegen", "Zweden", "Finland", "IJsland"],
  "Baltics": ["Estland", "Letland", "Litouwen"],
  "Polen & Tsjechië": ["Polen", "Tsjechië", "Slowakije"],
  "Balkan": ["Slovenië", "Kroatië", "Bosnië en Herzegovina", "Servië", "Montenegro", "Noord-Macedonië", "Albanië", "Kosovo"],
  "Griekenland & Cyprus": ["Griekenland", "Cyprus"],
  "Roemenië & Bulgarije": ["Roemenië", "Bulgarije", "Moldavië"],
  "Oekraïne": ["Oekraïne"],
  "Turkije & Kaukasus": ["Turkije", "Georgië", "Armenië", "Azerbeidzjan"],
  "Noord-Afrika": ["Marokko", "Algerije", "Tunesië"]
};

// ✅ Lengtes (simpel, duidelijk)
const lengths = {
  kort: { label: "Kort", distance: "0–400 km", tip: "Binnen hetzelfde land of net over de grens." },
  midden: { label: "Midden", distance: "400–900 km", tip: "1–2 landen verder, ideaal voor convoys." },
  lang: { label: "Lang", distance: "900+ km", tip: "Long haul door Europa, plan rustpauzes." }
};

// ✅ Trailer types i.p.v. cargo (want cargo is niet afdwingbaar)
const trailerTypes = {
  standaard: "Standaard (Box / Huif)",
  curtainsider: "Huiftrailer (Curtainsider)",
  box: "Gesloten trailer (Box)",
  ekeri: "Ekeri / Volume (High volume / Double deck)",
  reefer: "Koeltrailer (Reefer)",
  container: "Container chassis",
  flatbed: "Plateau (Flatbed)",
  lowbed: "Dieplader (Lowbed)",
  tanker: "Tank trailer"
};

// Helpers
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const regionNames = Object.keys(regions);
const allCountries = regionNames.flatMap(r => regions[r]);
const trailerKeys = Object.keys(trailerTypes);

// Slash command
const command = new SlashCommandBuilder()
  .setName('dispatch')
  .setDescription('ProMods dispatch: regio/heel Europa + lengte + trailer')
  .addStringOption(option =>
    option.setName('regio')
      .setDescription('Kies een regio, of Random voor heel Europa/ProMods')
      .setRequired(true)
      .addChoices(
        { name: 'Random (heel Europa)', value: 'random' },
        ...regionNames.slice(0, 24).map(r => ({ name: r, value: r }))
      ))
  .addStringOption(option =>
    option.setName('lengte')
      .setDescription('Lengte van de rit')
      .setRequired(true)
      .addChoices(
        { name: 'Random', value: 'random' },
        { name: 'Kort (0–400 km)', value: 'kort' },
        { name: 'Midden (400–900 km)', value: 'midden' },
        { name: 'Lang (900+ km)', value: 'lang' }
      ))
  .addStringOption(option =>
    option.setName('trailer')
      .setDescription('Welke trailer wil je rijden?')
      .setRequired(true)
      .addChoices(
        { name: 'Random', value: 'random' },
        { name: 'Standaard (Box/Huif)', value: 'standaard' },
        { name: 'Huiftrailer (Curtainsider)', value: 'curtainsider' },
        { name: 'Gesloten (Box)', value: 'box' },
        { name: 'Ekeri / Volume', value: 'ekeri' },
        { name: 'Koeltrailer (Reefer)', value: 'reefer' },
        { name: 'Container', value: 'container' },
        { name: 'Plateau (Flatbed)', value: 'flatbed' },
        { name: 'Dieplader (Lowbed)', value: 'lowbed' },
        { name: 'Tank', value: 'tanker' }
      ));

// Register command in 1 guild (jouw server) – sneller dan global
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [command.toJSON()] }
    );
    console.log("✅ /dispatch geregistreerd.");
  } catch (err) {
    console.error("❌ Fout bij registreren van /dispatch:", err);
  }
})();

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'dispatch') return;

  let regio = interaction.options.getString('regio');
  let lengte = interaction.options.getString('lengte');
  let trailer = interaction.options.getString('trailer');

  if (lengte === "random") lengte = pick(Object.keys(lengths));
  if (trailer === "random") trailer = pick(trailerKeys);

  const lengthInfo = lengths[lengte];

  const land = (regio === "random")
    ? pick(allCountries)
    : pick(regions[regio]);

  const trailerText = trailerTypes[trailer];

  const embed = new EmbedBuilder()
    .setTitle("🚛 ProMods Dispatch")
    .setDescription("Pak een job in Job Market / External Contracts die hier het dichtst bij komt.")
    .addFields(
      { name: "🧭 Regio", value: (regio === "random" ? "Random (heel Europa)" : regio), inline: true },
      { name: "🌍 Vertrekland", value: land, inline: true },
      { name: "📏 Lengte", value: `${lengthInfo.label} — ${lengthInfo.distance}`, inline: false },
      { name: "🚛 Trailer", value: trailerText, inline: false },
      { name: "🎯 Tip", value: `Zoek een job die start in **${land}** en kies een opdracht die ongeveer **${lengthInfo.distance}** is. Trailer: **${trailerText}**.`, inline: false }
    )
    .setFooter({ text: "Onbeperkt: je mag /dispatch zo vaak doen als je wil." });

  await interaction.reply({ embeds: [embed] });
});

client.login(process.env.TOKEN);
