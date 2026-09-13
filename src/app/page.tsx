 "use client";

import { FormEvent, useEffect, useState } from "react";
import { createDemoPlan } from "@/core/question/createDemoPlan";
import { demoQuestions } from "@/demo-data/questions";
import type { QuestionPlan } from "@/core/question/types";

const plannedModules = [
  ["问题拆解", "把一个知乎问题整理成清晰、可协作的任务。"],
  ["资料检索", "为后续官方知乎能力接入预留检索边界。"],
  ["观点排序", "比较不同回答的相关性与互补性。"]
];

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [plan, setPlan] = useState<QuestionPlan | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [oauthMessage, setOauthMessage] = useState("");

  useEffect(() => {
    void fetch("/api/oauth/status")
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => setAuthenticated(data.authenticated === true))
      .catch(() => setOauthMessage("无法读取当前授权状态。"));
    const status = new URLSearchParams(window.location.search).get("oauth");
    if (status === "error") setOauthMessage(new URLSearchParams(window.location.search).get("message") || "授权失败。");
  }, []);

  async function logout() {
    await fetch("/api/oauth/logout", { method: "POST" });
    setAuthenticated(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setPlan(createDemoPlan(question));
  }

  return (
    <main className="min-h-screen px-6 py-16 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-14">
        <header className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-zhihu-blue">
            Zhihu Hackathon
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Zhihu Collab Demo
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            输入一个问题，先用本地 Demo 数据生成可解释的协作任务计划。
            你也可以先授权知乎账号，为后续个性化协作能力做好准备。
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {authenticated ? (
              <>
                <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">知乎账号已授权</span>
                <button type="button" onClick={logout} className="text-sm text-slate-500 underline hover:text-slate-800">
                  退出授权
                </button>
              </>
            ) : (
              <a href="/api/oauth/start" className="rounded-full bg-zhihu-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                授权知乎账号
              </a>
            )}
          </div>
          {oauthMessage && <p className="mt-3 text-sm text-red-600">{oauthMessage}</p>}
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label htmlFor="question" className="text-lg font-semibold">
              你想和哪些观点协作？
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例如：如何系统学习 AI Agent 开发？"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-zhihu-blue focus:ring-2 focus:ring-blue-100"
            />
            <div className="flex flex-wrap gap-2">
              {demoQuestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuestion(item)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-blue-50 hover:text-zhihu-blue"
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="self-start rounded-full bg-zhihu-blue px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!question.trim()}
            >
              生成本地 Demo 计划
            </button>
          </form>
        </section>

        {plan && (
          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
            <p className="text-sm font-medium text-blue-700">本地 Demo 结果</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{plan.question.text}</h2>
            <div className="mt-6 grid gap-3">
              {plan.tasks.map((task) => (
                <article key={task.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold">{task.title}</h3>
                    <span className="text-xs font-medium uppercase text-slate-400">{task.status}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-5 md:grid-cols-3">
          {plannedModules.map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-zhihu-ink p-8 text-white shadow-xl sm:p-10">
          <p className="text-sm font-medium text-blue-200">当前状态</p>
          <h2 className="mt-3 text-2xl font-semibold">基础工程已就绪</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-300">
            还没有实现 Agent 或复杂交互。知乎适配器已预留在 integrations 层，但尚未由页面工作流调用。
            这样可以先稳定目录、边界和开发流程，再逐步增加可验证的能力。
          </p>
        </section>
      </div>
    </main>
  );
}
