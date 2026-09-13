# Parallel Development Contract

本文件是后续并行开发上下文的集成契约。本文档中的接口、边界和限制在没有
记录集成问题前不得擅自变更。

## Existing public types

以下类型已经存在，必须直接引用，不得重复定义同名类型：

- `QuestionAnalysis`：[`src/core/question/types.ts`](../src/core/question/types.ts)
- `ZhihuEvidence`：[`src/integrations/zhihu/types.ts`](../src/integrations/zhihu/types.ts)
- `Candidate`：[`src/core/ranking/aggregate.ts`](../src/core/ranking/aggregate.ts)

后续代码应使用这些文件中的定义和字段；如发现阻断性问题，记录到
[`docs/INTEGRATION_ISSUES.md`](./INTEGRATION_ISSUES.md)，不要直接修改冻结接口。

## Frozen module interfaces

以下接口集中定义在 [`src/types/contracts.ts`](../src/types/contracts.ts)，是
Ranking、Knowledge Delegates、Moderator 和 Demo UI 之间的唯一公共数据契约：

```ts
export interface RankedCandidate {
  authorId: string;
  authorName: string;
  fitScore: number;
  reason: string;
  evidenceIds: string[];
}

export interface DelegateOutput {
  authorId: string;
  canHelp: boolean;
  perspective: string;
  keyPoints: string[];
  limitations: string[];
  evidenceIds: string[];
  confidence: number;
}

export interface CollaborationResult {
  summary: string;
  consensus: string[];
  differences: {
    topic: string;
    perspectives: string[];
  }[];
  recommendedActions: string[];
  recommendedPeople: {
    authorId: string;
    reason: string;
  }[];
}

export interface WorkflowMetrics {
  llmCalls: number;
  queryCount: number;
  evidenceCount: number;
  candidateCount: number;
  delegateCount: number;
  durationMs: number;
}
```

## LLM boundary

业务模块只能通过 [`generateStructured`](../src/integrations/llm/provider.ts)
调用模型，禁止直接依赖厂商 SDK。Provider 只从环境变量读取
`LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL`；请求超时、JSON 解析失败和
其他请求错误会显式失败，最多自动重试一次。`DEMO_MODE=true` 时 Provider
直接拒绝真实模型调用。日志和错误信息不得包含 API Key。

## Shared limits

所有运行时限制集中在 [`src/config/limits.ts`](../src/config/limits.ts)：

| Constant | Value |
| --- | ---: |
| `MAX_SEARCH_QUERIES` | 3 |
| `MAX_RERANK_CANDIDATES` | 5 |
| `MAX_DELEGATES` | 3 |
| `MAX_AGENT_ROUNDS` | 1 |
| `MAX_EVIDENCE_PER_DELEGATE` | 3 |
| `MAX_LLM_CALLS` | 6 |

其他模块不得重新硬编码这些限制。

## File ownership

| Context | Primary ownership |
| --- | --- |
| A — Ranking | `src/core/ranking/rerank.ts` and ranking tests |
| B — Knowledge Delegates | `src/core/agents/knowledge-delegate.ts`, `src/core/agents/run-delegates.ts` and delegate tests |
| C — Moderator | `src/core/agents/moderator.ts` and moderator tests |
| D — Demo / Frontend | `src/demo-data/`, `src/app/`, `src/components/` |

Context D uses mock contracts for now and must not modify core Agent
implementations. Each branch owns only its module. Recommended branch names are
`feature/reranker`, `feature/delegates`, `feature/moderator`, and
`feature/demo-ui`; all branches must start from the same base commit.

## Shared principles

1. Do not change frozen public interfaces. Record blocking issues in
   `docs/INTEGRATION_ISSUES.md` first.
2. Do not add a database, FastAPI, Docker, LangGraph, or a persistent User
   Agent.
3. A Knowledge Delegate represents only knowledge perspectives supported by
   Evidence; it must not impersonate a real person.
4. Every Agent result must be traceable to Evidence through `evidenceIds`.
5. Agents must not engage in free-form Agent-to-Agent chat.
6. Keep changes within the owning module.
7. Before committing, run `npm run build` from `zhihu-collab-demo`.
