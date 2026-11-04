# OpenAI 狀態助手

無需離開聊天頁面，即可查看 OpenAI 官方服務狀態。本獨立使用者腳本採用 **status.openai.com** 的資料，並非 OpenAI 官方產品，也不會測量個人帳號或第三方網站的實際可用性。

## 支援網站

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## 顯示資訊與功能

- 位置設為自動時，狀態按鈕會跟隨左側邊欄。按鈕、詳細資料面板和通知會避開選單、輸入框等控制項，空間不足時會暫時隱藏。
- 依群組顯示服務元件，並列出尚未解決的服務異常、預定維護及上次查詢成功的時間。
- 可手動選擇[介面語言](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)，也可跟隨網頁或瀏覽器語言。官方公告的標題及內文保留原文。
- 可跟隨網站主題，也可手動選擇淺色或深色。按鈕可放在畫面左下角或右下角。支援鍵盤操作，按 Esc 即可收合面板。
- 頁面顯示時每 60 秒更新狀態，切到背景時暫停更新。請求逾時為 15 秒。重新整理失敗時會保留上次取得的資料，並標示為快取。
- 使用舊版 API 時，無法確認的服務異常或維護資訊會標示為「未核實」。

## 安裝與使用

先安裝 Tampermonkey 等使用者腳本管理器，再使用頁面上方的安裝按鈕。開啟支援網站，按一下狀態按鈕即可檢視詳情；齒輪按鈕可調整偏好設定。如果管理器需要在瀏覽器中完成額外設定才能執行使用者腳本，請依照其官方安裝說明操作。

## 隱私與權限

腳本僅向 `status.openai.com` 傳送匿名 GET 請求，且不會附上帳號 Cookie。腳本會根據頁面元素的位置、大小和顯示狀態調整版面，並讀取頁面語言及主題設定。腳本不會讀取或上傳提示詞、對話或帳號權杖。偏好設定和用來避免重複通知的紀錄僅儲存在本機。腳本不含使用情形分析、廣告、從外部下載後執行的程式碼或第三方翻譯服務。

## 原始碼與支援

[原始碼、文件與問題回報](https://github.com/laipeng101/openai-status-companion)，採用 MIT 授權條款。本頁保存完整且可讀的使用者腳本；原始碼與說明透過 GitHub push Webhook 自動同步。請透過 Greasy Fork 安裝與更新。

測試包括自動化檢查，以及在 Chrome 的本機測試頁面上檢查桌面及寬度為 390 像素時的版面。另使用事先取得的公開狀態資料在實際的 Leopard-X 頁面上檢查版面。結果及範圍請參閱[驗證文件](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md)。網站改版可能影響按鈕和面板的位置。

[更新日誌](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [語言支援](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
