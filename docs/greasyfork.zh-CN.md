# OpenAI 状态助手

无需离开聊天页面即可查看 OpenAI 官方服务状态。数据来自 **status.openai.com**，本脚本为独立项目，并非 OpenAI 官方产品，也不能判断个人账号或第三方站点的实际可用性。

## 支持的网站

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## 主要功能

- 位置设为自动时，状态按钮会跟随左侧栏。按钮、详情面板和提醒会避开菜单、输入框等页面控件，空间不足时会暂时隐藏。
- 按组显示服务组件，并列出尚未解决的服务异常、计划维护和上次查询成功的时间。
- 可手动选择[界面语言](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)，也可跟随网页或浏览器语言。官方通报的标题和正文保留原文。
- 主题可随网站切换，也可手动选择浅色或深色。按钮可设在左下角或右下角。支持键盘操作，按 Esc 可收起面板。
- 页面可见时每 60 秒更新状态，在后台时暂停更新。请求超时为 15 秒。刷新失败时会保留并标注上次获取的缓存数据。
- 使用旧版接口时，无法确认的服务异常或维护信息会标为“未核验”。

## 安装及使用

先安装 Tampermonkey 等用户脚本管理器，再点击上方“安装此脚本”。打开支持的网站，点击状态按钮查看详情，齿轮按钮可设置偏好。如果脚本管理器要求在浏览器中完成额外配置，请按其官方安装说明操作。

## 隐私与权限

脚本只向 `status.openai.com` 发送匿名 GET 请求，请求不携带账号 Cookie。脚本根据页面元素的位置、尺寸和显示状态调整布局，并读取页面语言和主题设置。脚本不会读取或上传提示词、聊天内容或账号令牌。偏好设置和用于避免重复提醒的记录仅保存在本地。脚本不包含使用情况统计、广告、远程可执行代码或第三方翻译服务。

## 源码与反馈

[GitHub 源码、说明与问题反馈](https://github.com/laipeng101/openai-status-companion)，采用 MIT 许可。此页面保存完整、可读的脚本，代码及各语言介绍在 GitHub 推送后通过 Webhook 自动同步；请通过 Greasy Fork 安装和更新。

测试包括自动化检查、在 Chrome 本地测试页面上进行的桌面及 390 像素宽度布局检查，以及使用事先获取的公开状态数据在真实 Leopard-X 页面上进行的布局检查。结果和测试范围见[验证说明](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md)。网站改版可能影响按钮和面板的位置。

[更新日志](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [语言覆盖](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
