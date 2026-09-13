"use client";

import { FormEvent, useState } from "react";
import { demoQuestions } from "@/demo-data/questions";
import { runExperienceCollaboration } from "@/lib/collaboration/client";
import type { CollaborationDemoResponse, DisclosureMode } from "@/lib/collaboration/types";

type Stage = "ASK" | "ANALYZING" | "MATCH" | "COLLABORATE" | "CONFIRM" | "REVIEW" | "PUBLISHED";
const steps = ["ASK", "MATCH", "COLLABORATE", "REVIEW & ANSWER"];
const sourceStyles = { public: "source-public", confirmed: "source-new", organized: "source-ai" } as const;

function Pill({ children }: { children: React.ReactNode }) { return <span className="pill">{children}</span>; }
function CheckList({ items }: { items: string[] }) { return <ul className="check-list">{items.map((item) => <li key={item}><b>✓</b>{item}</li>)}</ul>; }
function CardList({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return <div className="card-section"><h4>{title}</h4><Tag>{items.map((item) => <li key={item}>{item}</li>)}</Tag></div>;
}

export default function HomePage() {
  const [question, setQuestion] = useState<string>(demoQuestions[0]);
  const [data, setData] = useState<CollaborationDemoResponse | null>(null);
  const [stage, setStage] = useState<Stage>("ASK");
  const [disclosure, setDisclosure] = useState<DisclosureMode>("named");
  const [canQuote, setCanQuote] = useState(true);
  const [questionerApproved, setQuestionerApproved] = useState(false);
  const [practitionerApproved, setPractitionerApproved] = useState(false);
  const [saved, setSaved] = useState(false);

  async function begin(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setStage("ANALYZING");
    setData(await runExperienceCollaboration(question));
  }
  function reset(next = demoQuestions[0]) {
    setQuestion(next); setData(null); setStage("ASK"); setQuestionerApproved(false); setPractitionerApproved(false);
  }

  const majorIndex = stage === "ASK" || stage === "ANALYZING" ? 0 : stage === "MATCH" ? 1 : stage === "COLLABORATE" || stage === "CONFIRM" ? 2 : 3;
  return <main>
    <header className="topbar"><a className="brand" onClick={() => reset()}>知乎 <span>经验网络</span></a><nav><span className="demo-tag">DEMO MODE · 示例数据</span><span>发现</span><span>等你来答</span></nav></header>
    <div className="stepbar">{steps.map((item, index) => <div className={index <= majorIndex ? "step active" : "step"} key={item}><i>{index + 1}</i><span>{item}</span></div>)}</div>

    {stage === "ASK" && <section className="hero page">
      <Pill>知乎经验协作</Pill><h1>有些问题，<br/><em>答案只有做过的人知道。</em></h1>
      <p className="lead">当公开答案不够时，让知乎帮你找到真正经历过的人。</p>
      <form className="question-box" onSubmit={begin}><label htmlFor="question">说说你现在卡在哪里？</label><textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={4}/><div className="box-footer"><span>{question.length} 字 · 描述具体情境更容易找到相似经历</span><button>看看谁真正经历过 <b>→</b></button></div></form>
      <div className="scenario-row"><span>也可以试试</span>{demoQuestions.map((item, i) => <button key={item} onClick={() => setQuestion(item)}>0{i + 1} {i === 0 ? "从同事到主管" : i === 1 ? "职业选择" : "装修增项"}</button>)}</div>
      <div className="manifesto"><strong>Agent 负责发现与组织</strong><span>人负责经验与判断</span><p>不是让 AI 猜答案，而是让还没有被写出来的经验，也能成为知乎的答案。</p></div>
    </section>}

    {stage === "ANALYZING" && data && <section className="page narrow fade-in"><header className="section-head"><Pill>正在理解你的问题</Pill><h2>先分清：哪些已有答案，<br/>哪些必须问做过的人。</h2><p>系统不会立刻找“专家”，而是先确认公开知识是否真的不够。</p></header>
      <div className="split-card"><div className="public-side"><span className="eyebrow">PUBLIC KNOWLEDGE · 已有共识</span><h3>公开知识可以回答</h3><CheckList items={data.analysis.publicKnowledge}/><p>这些标准建议是对的，但没有覆盖你的具体关系与时机。</p></div><div className="gap-side"><span className="eyebrow">EXPERIENCE GAP · 仍需判断</span><h3>你的问题还缺少 3 个实践判断</h3><ol>{data.analysis.experienceGaps.map((x, i) => <li key={x}><b>0{i + 1}</b><span>{x}</span></li>)}</ol></div></div>
      <div className="callout"><span>“我不是不知道标准答案，<br/>我是不知道它为什么会在我的场景里失效。”</span><button onClick={() => setStage("MATCH")}>去找真正做过的人 →</button></div>
    </section>}

    {stage === "MATCH" && data && data.practitioner && <section className="page narrow fade-in"><header className="section-head"><Pill>MATCH · 按经历匹配</Pill><h2>这个问题，值得问<br/>真正做过的人。</h2><p>不是按头衔、粉丝或认证排序，而是寻找公开内容中的经历证据。</p></header>
      <div className="progress"><div>✓ <span>搜索相关知乎经验</span><b>找到 {data.search.evidenceCount} 条内容</b></div><div>✓ <span>识别做过类似事情的人</span><b>找到 {data.search.candidateCount} 位候选实践者</b></div><div>✓ <span>判断谁最匹配具体情境</span><b>推荐 1 位优先协作对象</b></div></div>
      <article className="match-card"><div className="match-person"><div className="avatar">{data.practitioner.initials}</div><div><small>{data.practitioner.label}</small><h3>{data.practitioner.name}</h3><p>公开内容显示 TA 可能拥有与你高度相似的经历</p></div><span className="match-score">高情境匹配</span></div><div className="why"><div><span className="eyebrow">为什么找到 TA？</span><CheckList items={data.practitioner.reasons}/></div><div className="evidence-stack">{data.practitioner.evidence.map(e => <article key={e.id}><small>知乎公开内容 · Evidence</small><h4>《{e.title}》</h4><p>{e.excerpt}</p></article>)}</div></div></article>
      <div className="boundary"><b>公开内容只能证明 TA 可能做过，不能替 TA 回答。</b><span>你的具体问题仍有变量没有公开答案，下一步需要本人确认。</span><button onClick={() => setStage("COLLABORATE")}>进入双 Agent 对齐 →</button></div>
    </section>}

    {stage === "COLLABORATE" && data && <section className="page wide fade-in"><header className="section-head"><Pill>COLLABORATE · 结构化协作</Pill><h2>双 Agent 先把问题聊清楚，<br/>真人只回答真正需要经验的部分。</h2><p>全局是按需启动的多 Agent 经验网络；一次任务最终只保留提问者 Agent 与实践者 Agent。</p></header>
      <div className="agent-map"><div><b>提问者</b><span>↓</span><strong>提问者 Agent</strong></div><div className="bridge">压缩上下文　↔　识别缺口</div><div><strong>实践者 Agent</strong><span>↓</span><b>{data.practitioner?.name}</b></div></div>
      <div className="card-grid"><article className="structured-card blue"><span>QUESTION CARD</span><h3>提问者 Agent 整理</h3><CardList title="背景" items={data.questionCard.background}/><CardList title="当前困扰" items={data.questionCard.concerns}/><CardList title="已经尝试" items={data.questionCard.attempted}/><CardList title="真正需要判断" items={data.questionCard.decisions} ordered/></article><article className="structured-card amber"><span>EXPERIENCE CARD</span><h3>实践者 Agent 整理</h3><CardList title="有公开证据的既有经历" items={data.experienceCard.relevantExperience}/><div className="quote"><small>已有公开观点</small>“{data.experienceCard.publicView}”</div><CardList title="仍需本人确认" items={data.experienceCard.needsConfirmation} ordered/></article></div>
      <div className="alignment"><h3>双方 Agent 对齐结果</h3><div><p><b>提问者 Agent</b>{data.alignment.questionerAgent}</p><i>↔</i><p><b>实践者 Agent</b>{data.alignment.practitionerAgent}</p></div><footer>已将一小时的完整作答，压缩为 <strong>3 个关键确认</strong><button onClick={() => setStage("CONFIRM")}>模拟实践者确认 →</button></footer></div>
    </section>}

    {stage === "CONFIRM" && data && <section className="page narrow fade-in"><header className="section-head"><Pill>HUMAN CONFIRMATION · Demo 模拟</Pill><h2>你的经验可能正好能<br/>帮到这个问题。</h2><p>预计需要 2–5 分钟。以下内容由示例实践者确认，不是 Agent 推测。</p></header>
      <article className="confirm-card"><div className="confirm-top"><div className="avatar">林</div><div><b>给 Demo 用户 @林舟 的确认卡</b><span>3 个问题 · 实践者拥有最终控制权</span></div></div>{data.confirmation.questions.map((q, i) => <div className="confirm-question" key={q}><small>问题 {i + 1}</small><h3>{q}</h3>{i === 0 ? <><textarea value={data.confirmation.newExperience} readOnly rows={6}/><div className="new-badge">✦ NEW EXPERIENCE <span>这条经验此前没有出现在公开内容中</span></div></> : <div className="mock-action"><button>确认已有内容</button><button>补充一句经验</button><button>不方便回答</button></div>}</div>)}
        <div className="controls"><h3>披露与发布控制</h3><div className="radio-row">{([['named','公开署名'],['anonymous','匿名发布'],['questioner-only','仅咨询者可见']] as const).map(([v,l]) => <label key={v}><input type="radio" checked={disclosure === v} onChange={() => setDisclosure(v)}/>{l}</label>)}</div><label className="toggle"><input type="checkbox" checked={canQuote} onChange={e => setCanQuote(e.target.checked)}/>允许 AI 总结，但不直接引用敏感项目细节</label><p>可随时选择不回答此项；敏感内容不会自动发布。</p></div>
      </article><button className="primary center" disabled={disclosure === "questioner-only"} onClick={() => setStage("REVIEW")}>{disclosure === "questioner-only" ? "仅咨询者可见，不能生成公开回答" : "确认边界，生成回答草稿 →"}</button>
    </section>}

    {stage === "REVIEW" && data && <section className="page narrow fade-in"><header className="section-head"><Pill>REVIEW & ANSWER</Pill><h2>把这次协作沉淀成<br/>一个新的知乎答案。</h2><p>完整回答只在真人补充后生成，并明确标记每一部分的来源。</p></header>
      <article className="draft"><div className="draft-title"><small>回答草稿 · 尚未公开</small><h2>{data.question}</h2><p>由 {disclosure === "anonymous" ? "匿名实践者" : "Demo 用户 @林舟"} 与提问者共同审核</p></div>{data.draft.map(s => <section className={sourceStyles[s.source]} key={s.source}><span>{s.title}</span><p>{s.content}</p></section>)}</article>
      <div className="review-grid"><article><small>QUESTIONER REVIEW</small><h3>提问者审核</h3><label><input type="checkbox" checked={questionerApproved} onChange={e => setQuestionerApproved(e.target.checked)}/>这个回答解决了我的问题</label><button>还缺一个关键问题</button></article><article><small>PRACTITIONER REVIEW</small><h3>实践者审核</h3><label><input type="checkbox" checked={practitionerApproved} onChange={e => setPractitionerApproved(e.target.checked)}/>确认引用、表达和署名边界</label><p>{disclosure === "anonymous" ? "将匿名发布" : "将以 Demo 用户 @林舟署名"} · 敏感信息已隐藏</p></article></div>
      <button className="primary center" disabled={!questionerApproved || !practitionerApproved} onClick={() => setStage("PUBLISHED")}>{questionerApproved && practitionerApproved ? "双方已确认，发布知乎回答 →" : "等待双方确认"}</button>
    </section>}

    {stage === "PUBLISHED" && data && <section className="published-page fade-in"><div className="published-banner">✓ PUBLISHED · 双方已审核</div><article className="zhihu-answer"><small>职场 · 管理 · 经验协作</small><h1>{data.question}</h1><div className="author"><div className="avatar">{disclosure === "anonymous" ? "匿" : "林"}</div><div><b>{disclosure === "anonymous" ? "匿名用户" : "林舟"}</b><span>{disclosure === "anonymous" ? "实践者选择匿名发布" : "示例实践者 · Demo 用户"}</span></div><button>＋ 关注</button></div>{data.draft.map(s => <section key={s.source}><label className={sourceStyles[s.source]}>{s.title}</label><p>{s.content}</p></section>)}<div className="proof">本回答引用 2 条公开 Evidence · 包含 1 条本次本人确认的新经验 · 提问者与实践者均已审核</div><div className="answer-actions"><button onClick={() => setSaved(!saved)}>▲ {saved ? "已收藏" : "收藏"}</button><button>继续追问</button><button>查看相关内容</button></div></article>
      <section className="flywheel"><Pill>知乎新增的经验资产</Pill><h2>一次协作，不只帮助一个人。</h2><div className="asset-grid"><b>1 <span>条实践经验</span></b><b>1 <span>条问题—经验关系</span></b><b>1 <span>条匹配证据</span></b><b>1 <span>篇新知乎回答</span></b></div><div className="flow">旧内容 <i>→</i> 发现谁做过什么 <i>→</i> 连接实践者 <i>→</i> <strong>产生新经验</strong> <i>→</i> 变成新内容 <i>→</i> 下次匹配更准确</div><h3>让还没有被写出来的经验，也能成为知乎的答案。</h3><button className="primary" onClick={() => reset()}>发起新的经验协作</button></section>
    </section>}
    <footer className="site-footer">知乎经验网络 · 全局多 Agent 网络，局部双 Agent 协作 · Agent 负责发现与组织，人负责经验与判断</footer>
  </main>;
}
