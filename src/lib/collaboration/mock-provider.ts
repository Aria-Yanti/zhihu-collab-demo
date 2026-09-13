import { demoQuestions } from "@/demo-data/questions";
import type { CollaborationDemoResponse } from "./types";

const management: CollaborationDemoResponse = {
  scenarioId: "first-time-manager",
  question: demoQuestions[0],
  analysis: {
    requiresHumanExperience: true,
    publicKnowledge: ["管理者应保持公平", "建立清晰的角色边界", "定期沟通并及时反馈", "避免私人关系影响绩效判断"],
    experienceGaps: [
      "第一次从同事变主管，什么时候应该主动重新建立关系边界？",
      "朋友成为下属后，需要刻意保持距离吗？",
      "第一次出现任务或绩效冲突时，怎样处理最不容易破坏长期关系？"
    ]
  },
  search: { evidenceCount: 24, candidateCount: 6, confidence: "high" },
  practitioner: {
    name: "@林舟",
    label: "示例实践者 · Demo 用户",
    initials: "林",
    reasons: ["经历与当前问题高度相似", "多条公开内容覆盖同类场景", "描述实际处理过程，而不只是管理理论"],
    evidence: [
      { id: "demo-lead-01", title: "第一次做 Team Lead，我犯过的三个错误", excerpt: "公开讨论了从团队成员晋升负责人后，继续沿用旧相处方式带来的问题。" },
      { id: "demo-lead-02", title: "从同事到管理者，真正困难的不是分任务", excerpt: "公开记录了管理原同事、朋友关系边界和第一次绩效反馈。" }
    ]
  },
  questionCard: {
    background: ["第一次成为团队主管", "管理以前共同工作的同事", "其中一人与自己私交很好"],
    concerns: ["分配任务时不敢太直接", "担心边界伤害朋友关系", "担心照顾朋友影响团队公平"],
    attempted: ["继续维持以前的相处方式", "分任务时尽量委婉", "暂时避免讨论关系变化"],
    decisions: ["是否主动谈一次角色变化？", "朋友成为下属后如何建立边界？", "冲突发生时先处理关系还是工作？"]
  },
  experienceCard: {
    relevantExperience: ["从个人贡献者晋升团队负责人", "管理过原来的同级同事", "处理过朋友成为直接汇报对象的情况"],
    publicView: "最初继续按照朋友方式相处，导致后续绩效反馈非常困难。",
    needsConfirmation: ["是否主动与团队谈过角色变化？", "是否与朋友单独沟通过边界？", "第一次真正发生冲突时如何处理？"]
  },
  alignment: {
    questionerAgent: "用户需要的不是一般管理原则，而是朋友／同事切换为主管关系时，边界应何时建立。",
    practitionerAgent: "公开内容覆盖角色转换与绩效反馈，但没有公开说明是否与朋友单独谈过关系变化。"
  },
  confirmation: {
    questions: ["你成为主管后，有没有主动和原同事谈角色变化？", "你如何对朋友说明工作边界？", "第一次冲突时，什么做法真正有效？"],
    newExperience: "我一开始没有谈，后来发现这是最大的错误之一。真正开始做绩效反馈时，大家会觉得以前默认的规则突然被改变。如果重来一次，我会在第一次分工前明确：私人关系不变，但工作判断会按照统一标准来做。",
    partial: false
  },
  draft: [
    { source: "public", title: "公开经验", content: "第一次从同事晋升主管时，最容易被低估的不是怎么分任务，而是原来的关系规则已经变化。继续按朋友方式相处，会让后续绩效反馈变得困难。" },
    { source: "confirmed", title: "本次补充", content: "林舟本人在本次 Demo 协作中确认：他当时没有及时说明角色变化，直到第一次绩效反馈才发现双方理解不同。如果重来，他会在第一次正式分工前明确：私人关系可以保持，工作评价必须采用统一标准。" },
    { source: "organized", title: "AI 整理", content: "因此可以先谈规则、再谈具体任务：对全员说明统一标准，再和朋友单独确认双方都接受工作关系中的直接反馈。以上仅为结构与语言组织，没有替实践者创造经历。" }
  ],
  metrics: { llmCalls: 0, queryCount: 3, evidenceCount: 24, candidateCount: 6, delegateCount: 2, durationMs: 4800 }
};

function variant(question: string, id: string, publicKnowledge: string[], gaps: string[]): CollaborationDemoResponse {
  return { ...management, scenarioId: id, question, analysis: { requiresHumanExperience: true, publicKnowledge, experienceGaps: gaps } };
}

const scenarios = [
  management,
  variant(demoQuestions[1], "career-choice", ["比较总薪酬", "评估岗位成长空间", "考虑行业风险"], ["岗位变窄后再转向有多难？", "30% 涨薪是否足以补偿路径风险？", "哪些信号说明所谓发展路径真的可兑现？"]),
  variant(demoQuestions[2], "renovation-overrun", ["核对合同与报价单", "保留变更记录", "设置预算缓冲"], ["哪些增项是施工前本可发现的？", "应该先停工还是先固定证据？", "哪些口头承诺最容易成为后续争议？"])
];

export async function runMockCollaboration(question: string): Promise<CollaborationDemoResponse> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  const normalized = question.trim();
  const scenario = scenarios.find((item) => item.question === normalized) ?? management;
  return { ...scenario, question: normalized || scenario.question };
}
