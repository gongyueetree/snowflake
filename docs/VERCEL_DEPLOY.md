# Vercel 部署与 Gemini 使用

当前项目是纯静态 HTML / CSS / JavaScript。仓库已包含运行所需的 dist 文件，无需构建或安装依赖。

## 从 GitHub 导入

1. 打开 https://vercel.com/new ，选择需要使用的个人账号或团队。
2. 导入 gongyueetree/snowflake；找不到时，在 GitHub 的 Vercel 集成中授权该仓库。
3. 使用以下设置（仓库根目录的 vercel.json 已提供默认配置）：

| 设置 | 值 |
| --- | --- |
| Framework Preset | Other |
| Root Directory | 仓库根目录，保持默认，不选 dist |
| Build Command | 留空 |
| Install Command | 留空 |
| Output Directory | dist |
| Production Branch | main |
| Environment Variables | 当前版本无需填写 |

4. 点击 Deploy，等待部署完成，再打开 Vercel 返回的网站地址。
5. 检查灯板添加/删除、六瓣轮舞、工程与实物预览、UF2 下载。

使用 Git 集成后，推送到所配置的生产分支将触发部署。当前只准备了配置，尚未替用户创建 Vercel 项目或执行部署。

## 保持使用 Gemini

打开部署后的网站，点击右侧「连接 Gemini」，输入自己在 Google AI Studio 创建的 API Key，点击「验证并连接」。应用会读取该 Key 可用的模型列表；选择支持文本生成与结构化输出的模型。默认模型若不可用，可改选列表中的合适模型。

当前请求由浏览器直接发送到 Google。Key 仅存于当前页面内存，刷新后需重填，不写入项目 JSON 或浏览器持久存储。使用专用 Key，只在自己信任的网站中输入；Google 请求仍受 Key 权限、额度与用户所在网络环境影响。网站托管到 Vercel 不会将这些请求改为由 Vercel 发出。

当前模式不读取 Vercel 的 GEMINI_API_KEY 环境变量；只添加该变量不会让网站自动连接。预置示例、编辑、仿真与固件下载无需 Gemini Key。实际 Gemini 调用需由用户使用有效 Key 验证，本次未执行收费模型请求。

## 如果希望所有用户共用你的 Gemini Key

需要增加 Vercel 服务端函数，例如 /api/generate：浏览器 → 服务端函数 → Gemini。将 GEMINI_API_KEY 仅保存在 Vercel 服务端环境变量中，由函数读取，同时加入用户认证、频率限制和用量控制。不要把共享 Key 写入前端 JS、公开仓库或公开前缀环境变量。这是后续架构升级，当前仓库尚未实现代理接口。

## 常见问题

- 首页 404：确认 Root Directory 为仓库根目录、Output Directory 为 dist。
- 要求 npm run build：选择 Other，清空 Build Command，使用仓库中的 vercel.json。
- 401/403：检查 Key 权限、API 限制与对应 Google 项目设置。
- 429：检查 Gemini 额度或调用频率。
- 无法连接 Google：当前是浏览器直连，检查本机网络与浏览器限制。
- 换域名后看不到旧项目：项目存在浏览器中且按站点隔离；在旧网站「保存项目」，再在新网站「导入项目」。

## 官方参考

- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/git/vercel-for-github
- https://ai.google.dev/gemini-api/docs/api-key
