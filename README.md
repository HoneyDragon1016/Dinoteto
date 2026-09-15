# Dinoteto (Embed FX) 🦖

一個基於 Discord.js v14 開發的強大社群媒體網址預覽修復機器人。當用戶在 Discord 中使用 `/fix` 斜線指令輸入損壞或無法正確生成預覽卡片（Embed）的社群連結時，機器人會透過 Webhook 自動偽裝成該用戶的身份發送修復後的網址。

本版本全面升級了**動態備援機制**與**全域私訊支援**，讓你在任何地方都能輕鬆修復連結！

---

## ✨ 核心功能

* 🌐 **全域與私訊完美支援 (User Apps)**：支援將指令安裝至個人帳號。在未邀請機器人的伺服器或私訊中，會智慧切換為「分離式隱藏訊息」，提供純淨網址讓手機端用戶能一鍵完美複製，且支援私訊直接預覽。
* 🧲 **全平台動態備援 (Dynamic Fallback)**：內建龐大的備援網站庫（包含萬用 `fixembed.app`）。若預覽失效，原作者只需點擊訊息上的 🧲 反應，機器人即會自動無縫切換下一個備援網域並重新發送。
* ⛓️‍💥 **強制快取刷新 (Cache Busting)**：Discord 預覽卡死抓不到？點擊 ⛓️‍💥 反應，機器人會自動攔截並替換網址追蹤碼為隨機時間戳，強迫 Discord CDN 重新抓取最新畫面。
* 👥 **完美身份偽裝**：自動讀取觸發指令用戶的伺服器暱稱與大頭貼，發送訊息時達到 100% 偽裝效果。
* 🧵 **討論串完美支援 (Threads)**：無論在一般頻道或討論串內皆能暢行無阻，精準投遞訊息。
* ❌ **原作者專屬控制權**：支援 ❌ 刪除反應，防呆機制確保「只有原指令觸發者」擁有刪除與切換備援的權限，他人點擊無效。

---

## 🔗 支援平台與備援清單

內建多組修復站點，並按優先度自動排序切換：

* **Instagram** ➡️ `oginstagram.com` / `fxig.seria.moe` / `d.toinstagram.com` / `eeinstagram.com` / `fixembed.app`
* **X (Twitter)** ➡️ `fixupx.com` / `vxtwitter.com` / `xeezz.com` (自動轉 `/i/`) / `fixembed.app`
* **Threads** ➡️ `fixthreads.seria.moe` / `fixembed.app` / `vxthreads.net`
* **Bilibili** ➡️ `bilibiliez.com` / `www.vxbilibili.com` / `fixembed.app`
* **Facebook (含 Watch)** ➡️ `facebed.seria.moe` / `facebed.com`
* **TikTok** ➡️ `tnktok.com` / `vxtiktok.com`
* **Pixiv** ➡️ `phixiv.net`
* **PTT** ➡️ `fxptt.seria.moe`
* **Reddit** ➡️ `rxddit.com`

---

## 🛠️ 開發環境與需求

* **Node.js**：`v24.15.0` 或以上版本
* **主要套件**：`discord.js v14`, `dotenv`
* **進程管理**：`PM2`

---

## 🚀 快速安裝與部署

### 1. 複製專案與安裝套件
將專案下載至在地小主機後，於專案根目錄執行：
```bash
npm install

```

### 2. 設定環境變數 (.env)

在專案根目錄下建立一個 `.env` 檔案，並填入你的 Discord Bot Token（此檔案已被納入 `.gitignore`，切勿推上 Git）：

```env
DISCORD_TOKEN=你的_DISCORD_BOT_TOKEN_金鑰

```

### 3. 測試執行 (前台)

在正式掛入背景前，建議先使用 Node.js 直接執行，確認 Token 注入與上線狀況：

```bash
node febot.js

```

*看到 `登入成功！Bot 已上線 : Dinoteto#0644` 即代表成功。*

---

## 📦 進程管理 (PM2)

本專案建議使用 PM2 進行背景常駐管理，以確保機器人 24 小時不間斷運行，並在崩潰時自動重啟。

* **首次啟動並命名**：
```bash
pm2 start febot.js --name "febot"

```


* **重啟機器人 (更新程式碼後)**：
```bash
pm2 restart febot

```


* **查看即時運行日誌**：
```bash
pm2 logs febot --lines 20

```


* **停止 / 刪除進程**：
```bash
pm2 stop febot
pm2 delete febot

```



---

## ⚠️ 開發者頁面設定提醒 (Discord Developer Portal)

請確保機器人在 Discord Developer Portal 啟用了以下設定：

1. **Bot 頁面**：
* 啟用 **Message Content Intent** (訊息內容意圖)。


2. **OAuth2 URL Generator 權限勾選**：
* `bot` 與 `applications.commands`
* **Bot Permissions** 必須包含：`Manage Webhooks`, `Send Messages in Threads`, `Read Message History`, `Add Reactions`, `Manage Messages` (用於移除他人亂點的表情反應)。


3. **User Install (使用者安裝) 支援**：
* 本程式碼的斜線指令已設定 `integration_types: [0, 1]` 與 `contexts: [0, 1, 2]`，請確保開發者後台已開放讓用戶將應用程式新增至個人帳號。
