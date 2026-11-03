# OpenAI 状态助手

无需离开聊天页面即可查看 OpenAI 官方服务状态。数据来自 **status.openai.com**，本脚本为独立项目，并非 OpenAI 官方产品，也不能判断个人账号或第三方站点的实际可用性。

## 支持的网站

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## 主要功能

- 自动位置模式下，状态按钮吸附在左侧栏外侧，随边栏展开、收起及宽度变化跟随定位；窄屏时保持在角落，面板尺寸受视口限制。
- 展示官方组件分组、进行中的事件、计划维护和上次成功获取时间。
- 支持 13 种界面语言：英文、简体中文、繁体中文、西班牙语、印地语、巴西葡萄牙语、日语、韩语、法语、德语、印度尼西亚语、阿拉伯语和俄语。可跟随网页或浏览器语言，也可手动切换；阿拉伯语采用从右向左排版。官方事件标题、正文保留原文，不调用翻译服务。
- 跟随网站明暗主题，可手动选择浅色、深色及左下、右下位置；支持键盘操作，Esc 收起面板。
- 可见页面每 60 秒刷新，后台暂停轮询；请求超时为 15 秒。刷新失败时保留上次成功数据，并明确标注缓存。
- 兼容数据缺少事件或维护字段时显示“未核验”，不会把不完整数据当作已核验的全部正常。

## 安装及使用

先安装 Tampermonkey 等用户脚本管理器，再点击上方“安装此脚本”。打开支持的网站，点击状态按钮查看详情，齿轮按钮可设置偏好。如果脚本管理器要求在浏览器中完成额外配置，请按其官方安装说明操作。

## 隐私与权限

状态请求仅匿名 GET 访问 `status.openai.com`，不携带账号 Cookie。脚本只检查边栏尺寸以及主题、语言属性，不读取或上传提示词、聊天正文和账号令牌。仅在本地保存偏好和状态提醒指纹，不含统计、广告、远程可执行依赖或第三方翻译服务。

## 源码与反馈

[GitHub 源码、说明与问题反馈](https://github.com/laipeng101/openai-status-companion)，采用 MIT 许可。此页面保存完整、可读的脚本，代码及各语言介绍在 GitHub 推送后通过 Webhook 自动同步；请通过 Greasy Fork 安装和更新。

测试涵盖自动化回归、Chrome 桌面及 390px 窄屏场景检查，并使用公开状态快照在真实 Leopard-X 页面验证布局。具体结果、测试范围及限制见仓库[验证说明](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md)；支持站点后续改版仍可能需要跟进适配。

[更新日志](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [语言覆盖](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
