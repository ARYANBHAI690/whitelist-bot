require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

/* ========= ENV ========= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ TOKEN or CLIENT_ID missing in .env");
  process.exit(1);
}

/* ========= CLIENT ========= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ========= CONFIG ========= */

const CONFIG_FILE = "./config.json";

let config = fs.existsSync(CONFIG_FILE)
  ? JSON.parse(fs.readFileSync(CONFIG_FILE))
  : { logChannel: null, whitelistChannel: null };

const saveConfig = () =>
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

let logChannel, whitelistChannel;

/* ========= SLASH COMMAND ========= */

const commands = [
  new SlashCommandBuilder()
    .setName("whitelist-panel")
    .setDescription("Open Minecraft whitelist panel")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("⏳ Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error("❌ Slash command error:", err);
  }
})();

/* ========= READY ========= */

client.once("ready", () => {
  if (config.logChannel)
    logChannel = client.channels.cache.get(config.logChannel);

  if (config.whitelistChannel)
    whitelistChannel = client.channels.cache.get(config.whitelistChannel);

  console.log(`🟢 Logged in as ${client.user.tag}`);
});

/* ========= UI ========= */

const panelButtons = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("whitelist")
      .setLabel("Whitelist")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("rename")
      .setLabel("Rename")
      .setStyle(ButtonStyle.Primary)
  );

/* ========= INTERACTIONS ========= */

client.on("interactionCreate", async (interaction) => {

  /* SLASH COMMAND */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === "whitelist-panel") {

    if (!config.logChannel || !config.whitelistChannel) {
      config.logChannel = interaction.channel.id;
      config.whitelistChannel = interaction.channel.id;
      saveConfig();

      logChannel = interaction.channel;
      whitelistChannel = interaction.channel;

      return interaction.reply({
        content: "✅ Channels saved. Run the command again.",
        ephemeral: true
      });
    }

    const panelEmbed = new EmbedBuilder()
      .setTitle("🧾 Minecraft Whitelist System")
      .setDescription(
        "Use the buttons below to **whitelist** or **rename** your Minecraft username."
      )
      .setColor(0x2ecc71)
      .setFooter({ text: "mcFleet Whitelist Panel" })
      .setTimestamp();

    return interaction.reply({
      embeds: [panelEmbed],
      components: [panelButtons()]
    });
  }

  /* WHITELIST BUTTON */
  if (interaction.isButton() && interaction.customId === "whitelist") {
    const modal = new ModalBuilder()
      .setCustomId("whitelist_modal")
      .setTitle("Whitelist Username")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("username")
            .setLabel("Minecraft Username")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    return interaction.showModal(modal);
  }

  /* RENAME BUTTON */
  if (interaction.isButton() && interaction.customId === "rename") {
    const modal = new ModalBuilder()
      .setCustomId("rename_modal")
      .setTitle("Rename Username")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("old")
            .setLabel("Old Username")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("new")
            .setLabel("New Username")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    return interaction.showModal(modal);
  }

  /* WHITELIST SUBMIT */
  if (interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === "whitelist_modal") {

    await interaction.deferReply({ ephemeral: true });

    const username = interaction.fields.getTextInputValue("username");
    const edition = username.startsWith(".") ? "Bedrock" : "Java";

    const whitelistEmbed = new EmbedBuilder()
      .setTitle("📥 Whitelist Added")
      .setColor(0x57f287)
      .addFields(
        { name: "User", value: interaction.user.tag, inline: true },
        { name: "Username", value: username, inline: true },
        { name: "Edition", value: edition, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    logChannel.send({ embeds: [whitelistEmbed] });
    whitelistChannel.send(`whitelist add ${username}`);

    return interaction.editReply("✅ Whitelisted successfully!");
  }

  /* RENAME SUBMIT */
  if (interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === "rename_modal") {

    await interaction.deferReply({ ephemeral: true });

    const oldName = interaction.fields.getTextInputValue("old");
    const newName = interaction.fields.getTextInputValue("new");

    const renameEmbed = new EmbedBuilder()
      .setTitle("✏️ Username Renamed")
      .setColor(0xfaa61a)
      .addFields(
        { name: "User", value: interaction.user.tag, inline: true },
        { name: "Old Username", value: oldName, inline: true },
        { name: "New Username", value: newName, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();

    logChannel.send({ embeds: [renameEmbed] });
    whitelistChannel.send(`whitelist remove ${oldName}`);
    whitelistChannel.send(`whitelist add ${newName}`);

    return interaction.editReply("✅ Rename completed!");
  }
});

/* ========= LOGIN ========= */

client.login(TOKEN);
