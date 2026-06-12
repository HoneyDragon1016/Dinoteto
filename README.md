# Dinoteto (Embed FX) 🦖

一個基於 Discord.js v14 開發的社群媒體網址預覽修復機器人。當用戶在 Discord 中使用 `/fix` 斜線指令輸入損壞或無法正確生成預覽卡片（Embed）的社群連結時，機器人會透過 Webhook 自動偽裝成該用戶的身份，發送修復後的轉址連結，並提供乾淨的原文按鈕與原作者專屬的刪除機制。

---

## ✨ 核心功能

* 👥 **完美身份偽裝**：自動讀取觸發指令用戶的伺服器暱稱與大頭貼，發送訊息時達到 100% 偽裝效果。
* 🧵 **討論串完美支援 (Threads)**：無論在一般頻道或討論串內皆能暢行無阻，精準投遞訊息。
* 🔗 **多平台轉址修復**：
  * **Facebook** ➡️ `facebed.seria.moe` (支援標準、手機版與 `fb.watch` 短網址)
  * **X / Twitter** ➡️ `fixupx.com`
  * **Instagram** ➡️ `fxig.seria.moe`
  * **Threads** ➡️ `fixthreads.seria.moe`
  * **TikTok** ➡️ `vxtiktok.com`
  * **Pixiv** ➡️ `phixiv.net`
  * **Reddit** ➡️ `rxddit.com`
  * **Bilibili** ➡️ `biliembed.com`
* ↗️ **原文連結按鈕**：修復訊息下方附帶 `Original link ↗️` 互動按鈕，方便用戶一鍵跳回原站。
* ❌ **原作者刪除機制**：點擊訊息上的 ❌ 反應即可秒刪該則修復訊息。防呆機制確保「只有原指令觸發者」擁有刪除權限。

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
