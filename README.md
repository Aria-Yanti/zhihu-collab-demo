# zhihu-collab-demo

知乎黑客松协作式问题探索 Demo。

## 当前范围

当前版本完成独立的 Next.js 工程初始化、目录结构、问题输入、本地 Demo
任务计划和设计文档：

- 未实现 Agent；
- 未在页面中调用知乎 API；
- 已增加服务端使用的官方知乎搜索适配器，但尚未接入页面工作流；
- 未实现 LLM 调用；
- 未复用或修改旧的 `zhihu-circle` 项目代码。

官方 `zhihu-hackathon` Skill 仅作为后续知乎能力层接入的参考。

## 环境要求

- Windows
- Node.js
- npm
- VS Code

## 启动

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## 构建

```bash
npm run build
npm start
```

## 配置

复制 `.env.example` 为 `.env.local`。设置 `DEMO_MODE=true` 时，`searchZhihu` 从
`src/demo-data/zhihu-search.json` 返回经过 normalize 的确定性数据。Live Mode
默认调用项目级官方 Skill 的 `scripts/run.sh search zhihu`；如 Skill runner
不在默认位置，可通过 `ZHIHU_SKILL_RUNNER` 指定绝对路径。Live Mode 调用失败
会记录可读错误并返回空数组，不会让 Demo 崩溃。

当前 Demo 已实现知乎 OAuth 登录、回调和服务端会话；知乎用户数据接口尚未接入。
OAuth 登录入口为 `/api/oauth/start`，回调必须使用公网
HTTPS 地址并以 `/api/oauth/callback` 结尾。不要把 OAuth App Key 写入仓库或前端
配置；部署时应通过平台 Secret 注入 `ZHIHU_OAUTH_APP_KEY`。OAuth Token 仅保存在
服务端 HttpOnly Cookie 中，退出登录或过期后失效。

```env
ZHIHU_APP_ID=451
ZHIHU_OAUTH_APP_KEY=通过部署平台 Secret 配置
ZHIHU_REDIRECT_URI=https://你的域名/api/oauth/callback
```

真实授权前，请将完全相同的 `ZHIHU_REDIRECT_URI` 登记到知乎开放平台。当前 Linux
开发环境不把 App Key 写入文件；本地页面可以开发和预览，但真实 OAuth 应使用部署
后的公网 HTTPS 回调地址。

```ts
import { searchZhihu } from "@/integrations/zhihu/client";

const evidence = await searchZhihu("如何系统学习 AI Agent 开发？");
```

## 项目结构

```text
src/
├── app/
├── components/
├── core/
│   ├── question/
│   ├── retrieval/
│   ├── ranking/
│   ├── agents/
│   └── workflow/
├── integrations/
│   ├── zhihu/
│   └── llm/
├── demo-data/
├── types/
└── config/
docs/
├── ARCHITECTURE.md
├── DEMO_FLOW.md
└── TECH_DECISIONS.md
```
