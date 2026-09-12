# Technical Decisions

- Use Next.js App Router, TypeScript, and Tailwind CSS.
- Keep this project independent from the previous `zhihu-circle` Demo.
- Do not add FastAPI, Python, Docker, PostgreSQL, Redis, or LangGraph.
- Do not implement Agents or Zhihu API calls during initialization.
- Treat the bundled official `zhihu-hackathon` Skill as an integration reference,
  not as a reason to duplicate its runtime responsibilities.
- Prefer small, task-activated workflows over a permanent Agent process.
