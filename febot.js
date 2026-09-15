const { ReadableStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('--- 偵錯資訊 ---');
console.log('專案絕對路徑:', __dirname);
console.log('讀取到的 Token 類型:', typeof process.env.DISCORD_TOKEN);
console.log('讀取到的 Token 長度:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);
console.log('----------------');

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ 錯誤：找不到 DISCORD_TOKEN，請檢查 .env 檔案！');
  process.exit(1);
}

const TOKEN = process.env.DISCORD_TOKEN;
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials, ChannelType, MessageFlags } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions, 
  ],
  partials: [Partials.Message, Partials.Reaction], 
});

const WEBHOOK_NAME = 'EF'; 
const messageDataMap = new Map();

// 🌟 更新：引入全網域備援 fixembed.app，並調整 Threads 優先度
const RULES = [
  {
    name: 'Instagram',
    pattern: /https?:\/\/(?:www\.)?instagram\.com\/([^\s]+)/gi,
    domains: ["oginstagram.com", "fxig.seria.moe", "d.toinstagram.com", "eeinstagram.com", "fixembed.app"],
    // buildUrl 現在接收 match (完整原始網址)
    buildUrl: (domain, match, p1) => {
      if (domain === 'fixembed.app') return `https://fixembed.app/embed?url=${match}`;
      return `https://${domain}/${p1}`;
    }
  },
  {
    name: 'X (Twitter)',
    pattern: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([^\s]+)/gi,
    domains: ["fixupx.com", "vxtwitter.com", "xeezz.com", "fixembed.app"],
    buildUrl: (domain, match, p1) => {
      if (domain === 'fixembed.app') return `https://fixembed.app/embed?url=${match}`;
      if (domain === 'xeezz.com') {
        const parts = p1.split('/');
        if (parts.length > 1) {
          parts[0] = 'i';
          return `https://${domain}/${parts.join('/')}`;
        }
      }
      return `https://${domain}/${p1}`;
    }
  },
  {
    name: 'Bilibili',
    pattern: /https?:\/\/(?:www\.)?bilibili\.com\/video\/([^\s]+)/gi,
    domains: ["bilibiliez.com", "www.vxbilibili.com", "fixembed.app"],
    buildUrl: (domain, match, p1) => {
      if (domain === 'fixembed.app') return `https://fixembed.app/embed?url=${match}`;
      return `https://${domain}/video/${p1}`;
    }
  },
  {
    name: 'Threads',
    pattern: /https?:\/\/(?:www\.)?threads\.(?:net|com)\/@?([^\s]+)/gi,
    // 依據您的要求：1. seria.moe, 2. fixembed.app, 3. vxthreads.net
    domains: ["fixthreads.seria.moe", "fixembed.app", "vxthreads.net"],
    buildUrl: (domain, match, p1) => {
      if (domain === 'fixembed.app') return `https://fixembed.app/embed?url=${match}`;
      return `https://${domain}/${p1}`;
    }
  },
  // --- 以下維持原樣 ---
  {
    name: 'Facebook',
    pattern: /https?:\/\/(?:[a-z0-9]+\.)?facebook\.com\/([^\s]+)/gi,
    domains: ["facebed.seria.moe", "facebed.com"],
    buildUrl: (domain, match, p1) => `https://${domain}/${p1}`
  },
  {
    name: 'Facebook Watch',
    pattern: /https?:\/\/fb\.watch\/([^\s]+)/gi,
    domains: ["facebed.seria.moe", "facebed.com"],
    buildUrl: (domain, match, p1) => `https://${domain}/watch/${p1}`
  },
  {
    name: 'Pixiv',
    pattern: /https?:\/\/(?:www\.)?pixiv\.net\/(?:[\w]*\/)*artworks\/(\d+)([^\s]*)/gi,
    domains: ["phixiv.net"], 
    buildUrl: (domain, match, p1, p2) => `https://${domain}/artworks/${p1}${p2}`
  },
  {
    name: 'PTT',
    pattern: /https?:\/\/(?:www\.)?ptt\.cc\/([^\s]+)/gi,
    domains: ["fxptt.seria.moe"],
    buildUrl: (domain, match, p1) => `https://${domain}/${p1}`
  },
  {
    name: 'TikTok',
    pattern: /https?:\/\/(?:[a-zA-Z0-9]+\.)?tiktok\.com\/([^\s]+)/gi,
    domains: ["tnktok.com", "vxtiktok.com"],
    buildUrl: (domain, match, p1) => `https://${domain}/${p1}`
  },
  {
    name: 'Reddit',
    pattern: /https?:\/\/(?:www\.)?reddit\.com\/([^\s]+)/gi,
    domains: ["rxddit.com"],
    buildUrl: (domain, match, p1) => `https://${domain}/${p1}`
  }
];

function processContent(text, serviceIndex = 0, forceCacheBust = false) {
  let hasFixed = false;
  let fixedText = text;
  let detectedPlatforms = new Set(); 

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0; 

    if (rule.pattern.test(fixedText)) {
      hasFixed = true;
      detectedPlatforms.add(rule.name);
      rule.pattern.lastIndex = 0; 
      
      fixedText = fixedText.replace(rule.pattern, (...args) => {
        const match = args[0]; // 🌟 擷取完整原網址，供 fixembed.app 使用
        const domain = rule.domains[serviceIndex % rule.domains.length];
        const captures = args.slice(1, -2); 
        
        let finalUrl = rule.buildUrl(domain, match, ...captures);
        
        // ⛓️‍💥 快取破壞邏輯
        if (forceCacheBust) {
          if (domain === 'fixembed.app') {
            // 如果是 fixembed，它本身就有 ?url=，所以用 &v= 來附加參數，避免破壞原網址
            finalUrl += `&v=${Date.now()}`;
          } else {
            // 其他一般網域，截斷原有的追蹤碼 (?) 並替換成時間戳
            const qIndex = finalUrl.indexOf('?');
            if (qIndex !== -1) {
              finalUrl = finalUrl.substring(0, qIndex) + `?v=${Date.now()}`;
            } else {
              finalUrl += `?v=${Date.now()}`;
            }
          }
        }
        return finalUrl;
      });
    }
  }
  
  return { 
    fixedText: hasFixed ? fixedText : null, 
    platforms: Array.from(detectedPlatforms) 
  };
}

function extractCleanUrl(text) {
  const match = text.match(/https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/i);
  return match ? match[0] : text;
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
  let webhook = webhooks.find(wh => wh.name === WEBHOOK_NAME && wh.owner?.id === client.user.id);
  
  if (!webhook) {
    webhook = await targetChannel.createWebhook({
      name: WEBHOOK_NAME,
      reason: '用於轉址修復 Discord 社群嵌入卡片功能',
    });
  }
  return webhook;
}

client.once('clientReady', async () => {
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
      integration_types: [0, 1],
      contexts: [0, 1, 2],
    },
  ];
  try {
    await client.application.commands.set(commands);
    console.log('斜線指令註冊成功！');
  } catch (error) {
    console.error('註冊指令時出錯:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'fix') {
    const rawInput = interaction.options.getString('url');
    const result = processContent(rawInput, 0, false);

    if (!result.fixedText) {
      return interaction.reply({ 
        content: '這不屬於支援的網址格式，或者網址無須修復。', 
        flags: [MessageFlags.Ephemeral] 
      });
    }

    const { fixedText, platforms } = result;
    const platformsText = platforms.length > 0 ? platforms.join('、') : '網址';
    const successMsg = `✅ 已成功發送！\n若 **${platformsText}** 的預覽未正常顯示，可對此訊息按 🧲 切換備援服務，或按 ⛓️‍💥 強制刷新快取。`;

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

    try {
      const channel = interaction.channel;
      
      if (!channel || typeof channel.fetchWebhooks !== 'function') {
        await interaction.editReply({ 
          content: `✅ 網址修復完成！請長按複製下方獨立訊息：\n*(提示：若預覽未顯示，可自行在網址後方加上 ?v=1 等數字來強制刷新快取)*` 
        });
        
        await interaction.followUp({
          content: fixedText,
          flags: [MessageFlags.Ephemeral]
        });
        return; 
      }

      const webhook = await getOrCreateWebhook(channel);
      const cleanOriginalUrl = extractCleanUrl(rawInput);
      const row = createOriginalLinkButton(cleanOriginalUrl);
      
      const isThread = channel.isThread?.() || [ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(channel.type);
      const threadId = isThread ? channel.id : undefined;

      const username = interaction.member?.displayName || interaction.user.username;
      const avatarURL = interaction.user.displayAvatarURL({ dynamic: true });

      const webhookMessage = await webhook.send({
        content: fixedText,
        username: username,
        avatarURL: avatarURL,
        components: [row],
        threadId: threadId 
      });

      messageDataMap.set(webhookMessage.id, {
        authorId: interaction.user.id,
        username: username,
        avatarURL: avatarURL,
        rawInput: rawInput,
        serviceIndex: 0,
        forceCacheBust: false
      });

      await interaction.editReply({ content: successMsg }).catch(() => {});

    } catch (err) {
      console.error('Webhook 發送失敗，詳細錯誤:', err);
      await interaction.editReply({ content: '發送失敗，請檢察機器人 Webhook 權限。' }).catch(() => {});
    }
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  const validEmojis = ['❌', '🧲', '⛓️‍💥'];
  if (!validEmojis.includes(reaction.emoji.name)) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('獲取反應訊息失敗:', error);
      return;
    }
  }

  const messageId = reaction.message.id;
  if (!messageDataMap.has(messageId)) return;

  const data = messageDataMap.get(messageId);
  if (user.id !== data.authorId) {
    await reaction.users.remove(user.id).catch(() => {});
    return;
  }

  if (reaction.emoji.name === '❌') {
    try {
      await reaction.message.delete();
      messageDataMap.delete(messageId);
    } catch (err) {}
    return; 
  }

  if (reaction.emoji.name === '🧲') {
    data.serviceIndex += 1;
  } else if (reaction.emoji.name === '⛓️‍💥') {
    data.forceCacheBust = true;
  }

  try {
    const channel = reaction.message.channel;
    const webhook = await getOrCreateWebhook(channel);
    
    const result = processContent(data.rawInput, data.serviceIndex, data.forceCacheBust);
    const cleanOriginalUrl = extractCleanUrl(data.rawInput);
    const row = createOriginalLinkButton(cleanOriginalUrl);

    const isThread = channel.isThread?.() || [ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(channel.type);
    const threadId = isThread ? channel.id : undefined;

    await reaction.message.delete();
    messageDataMap.delete(messageId); 

    const webhookMessage = await webhook.send({
      content: result.fixedText,
      username: data.username, 
      avatarURL: data.avatarURL, 
      components: [row],
      threadId: threadId 
    });

    messageDataMap.set(webhookMessage.id, data);

  } catch (err) {
    console.error('重新切換發送訊息失敗:', err);
  }
});

client.login(TOKEN);
