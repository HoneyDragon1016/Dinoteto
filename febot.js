const path = require('path');
// 鎖定讀取同資料夾底下的 .env 檔案
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 偵錯小幫手：確認 Token 順利注入
console.log('--- 偵錯資訊 ---');
console.log('專案絕對路徑:', __dirname);
console.log('讀取到的 Token 類型:', typeof process.env.DISCORD_TOKEN);
console.log('讀取到的 Token 長度:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);
console.log('----------------');

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ 錯誤：找不到 DISCORD_TOKEN，請檢查 .env 檔案！');
  process.exit(1);
}

// 1. 這裡把 TOKEN 與 Discord 套件先宣告好，確保後面全部讀得到
const TOKEN = process.env.DISCORD_TOKEN;
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials, ChannelType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions, 
  ],
  partials: [Partials.Message, Partials.Reaction], 
});

const WEBHOOK_NAME = 'EF'; 

const RULES = [
  { pattern: /https?:\/\/(?:[a-z0-9]+\.)?facebook\.com\/([^\s]+)/gi, replacement: "https://facebed.seria.moe/$1" },
  { pattern: /https?:\/\/fb\.watch\/([^\s]+)/gi, replacement: "https://facebed.seria.moe/watch/$1" },
  { pattern: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([^\s]+)/gi, replacement: "https://fixupx.com/$1" },
  { pattern: /https?:\/\/(?:www\.)?instagram\.com\/([^\s]+)/gi, replacement: "https://fxig.seria.moe/$1" },
  { pattern: /https?:\/\/(?:www\.)?threads\.(?:net|com)\/@?([^\s]+)/gi, replacement: "https://fixthreads.seria.moe/$1" },
  { pattern: /https?:\/\/(?:www\.)?tiktok\.com\/([^\s]+)/gi, replacement: "https://vxtiktok.com/$1" },
  { pattern: /https?:\/\/(?:www\.)?pixiv\.net\/(?:[\w]*\/)*artworks\/(\d+)([^\s]*)/gi, replacement: "https://phixiv.net/artworks/$1$2" },
  { pattern: /https?:\/\/(?:www\.)?reddit\.com\/([^\s]+)/gi, replacement: "https://rxddit.com/$1" },
  { pattern: /https?:\/\/(?:www\.)?bilibili\.com\/video\/([^\s]+)/gi, replacement: "https://biliembed.com/video/$1" },
];

const authorMap = new Map();

function fixUrl(text) {
  let hasFixed = false;
  let fixedText = text;
  for (const rule of RULES) {
    if (rule.pattern.test(fixedText)) {
      fixedText = fixedText.replace(rule.pattern, rule.replacement);
      hasFixed = true;
    }
  }
  return hasFixed ? fixedText : null;
}

function createOriginalLinkButton(url) {
  const button = new ButtonBuilder()
    .setLabel('Original link ↗️')
    .setStyle(ButtonStyle.Link)
    .setURL(url);
  return new ActionRowBuilder().addComponents(button);
}

async function getOrCreateWebhook(channel) {
  const isThread = channel.isThread?.() || [ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(channel.type);
  const targetChannel = isThread ? (channel.parent || channel) : channel;

  if (!targetChannel || typeof targetChannel.fetchWebhooks !== 'function') {
    throw new Error('此頻道類型不支援 Webhook');
  }

  const webhooks = await targetChannel.fetchWebhooks();
  let webhook = webhooks.find(wh => wh.name === WEBHOOK_NAME);
  
  if (!webhook) {
    webhook = await targetChannel.createWebhook({
      name: WEBHOOK_NAME,
      reason: '用於轉址修復 Discord 社群嵌入卡片功能',
    });
  }
  return webhook;
}

client.once('ready', async () => {
  console.log(`登入成功！Bot 已上線 : ${client.user.tag}`);
  const commands = [
    {
      name: 'fix',
      description: '修復影片或社群文章網址預覽並以你的身份發送',
      options: [
        {
          name: 'url',
          type: 3,
          description: '想要修復的社群平台網址',
          required: true,
        },
      ],
    },
  ];
  try {
    await client.application.commands.set(commands);
    console.log('斜線指令註冊成功！');
  } catch (error) {
    console.error('註冊指令時出錯:', error);
  }
});

// 處理斜線指令 (/fix)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'fix') {
    const url = interaction.options.getString('url');
    const fixedUrl = fixUrl(url);

    if (!fixedUrl) {
      return interaction.reply({ content: '這不屬於支援的網址格式，或者網址無須修復。', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    try {
      const channel = interaction.channel;
      const webhook = await getOrCreateWebhook(channel);
      const row = createOriginalLinkButton(url);
      
      const isThread = channel.isThread?.() || [ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(channel.type);
      const threadId = isThread ? channel.id : undefined;

      const webhookMessage = await webhook.send({
        content: fixedUrl,
        username: interaction.member?.displayName || interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL({ dynamic: true }),
        components: [row],
        threadId: threadId 
      });

      authorMap.set(webhookMessage.id, interaction.user.id);
      await interaction.editReply({ content: '✅ 已成功以您的身份修復並發送網址！' }).catch(() => {});

    } catch (err) {
      console.error('Webhook 發送失敗，詳細錯誤:', err);
      await interaction.editReply({ content: '發送失敗，請檢察機器人 Webhook 權限。' }).catch(() => {});
    }
  }
});

// 監聽 ❌ 反應
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot || reaction.emoji.name !== '❌') return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('獲取反應訊息失敗:', error);
      return;
    }
  }

  const messageId = reaction.message.id;

  if (authorMap.has(messageId)) {
    const originalAuthorId = authorMap.get(messageId);
    if (user.id === originalAuthorId) {
      try {
        await reaction.message.delete();
        authorMap.delete(messageId);
        console.log(`訊息 ${messageId} 已被原作者 ${user.username} 刪除。`);
      } catch (err) {
        console.error('刪除訊息失敗:', err);
      }
    } else {
      await reaction.users.remove(user.id).catch(() => {});
    }
  }
});

client.login(TOKEN);