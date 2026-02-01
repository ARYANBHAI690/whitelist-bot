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
const express = require("express");

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;        // bot token
const CLIENT_ID = process.env.CLIENT_ID; // application id
const PORT = process.env.PORT || 3000;

// Server branding
const SERVER_NAME = "mcFleet SMP";

// Theme colors
const THEME = {
  primary: 0x5865F2,
  success: 0x57F287,
  warning: 0xFEE75C
};

// Emojis
const EMOJI = {
  panel: "🧩",
  whitelist: "📥",
  rename: "✏️",
  java: "☕",
  bedrock: "🪨",
  success: "✅",
  user: "👤"
};

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= ANTI SLEEP ================= */

const app = express();
app.get("/", (req, res) => res.send("🟢 Bot is alive"));
app.listen(PORT, () => console.log("🌍 Anti-sleep web server running"));

/* ================= UTILS ================= */

function detectEdition(username) {
  if (username.startsWith(".")) return `${EMOJI.bedrock} Bedrock`;
  if (/^[a-zA-Z0-9_]{3,16}$/.test(username)) return `${EMOJI.java} Java`;
  return "❓ Unknown";
}

/* ================= SLASH COMMAND ================= */

const commands = [
  new SlashCommandBuilder()
    .setName("whitelist-panel")
    .setDescription("Open whitelist panel")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash command registered");
  } catch (e) {
    console.error("❌ Slash command error", e);
  }
})();

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

/* ================= UI BUTTONS ================= */

const buttons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("whitelist")
    .setLabel("Whitelist")
    .setEmoji(EMOJI.whitelist)
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId("rename")
    .setLabel("Rename")
    .setEmoji(EMOJI.rename)
    .setStyle(ButtonStyle.Primary)
);

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async (interaction) => {

  /* PANEL */
  if (interaction.isChatInputCommand() &&
      interaction.commandName === "whitelist-panel") {

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI.panel} ${SERVER_NAME} Whitelist System`)
      .setDescription(
        `${EMOJI.whitelist} **Whitelist** – Add your Minecraft username\n` +
        `${EMOJI.rename} **Rename** – Change your username`
      )
      .setColor(THEME.primary)
      .setThumbnail(interaction.guild?.iconURL({ dynamic: true }))
      .setFooter({ text: "Fast • Clean • Automatic" });

    return interaction.reply({
      embeds: [embed],
      components: [buttons]
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

    const username = interaction.fields.getTextInputValue("username");
    const edition = detectEdition(username);

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI.success} Whitelisted`)
      .addFields(
        { name: `${EMOJI.user} Username`, value: username, inline: true },
        { name: "Edition", value: edition, inline: true }
      )
      .setColor(THEME.success)
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }

  /* RENAME SUBMIT */
  if (interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === "rename_modal") {

    const oldName = interaction.fields.getTextInputValue("old");
    const newName = interaction.fields.getTextInputValue("new");

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI.rename} Rename Complete`)
      .addFields(
        { name: "Old Username", value: oldName, inline: true },
        { name: "New Username", value: newName, inline: true }
      )
      .setColor(THEME.warning)
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
});

/* ================= LOGIN ================= */

client.login(TOKEN);
