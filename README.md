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
