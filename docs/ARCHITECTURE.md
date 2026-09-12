# Architecture

## Scope

`zhihu-collab-demo` is a standalone Next.js + TypeScript + Tailwind project. The
initial version contains only the application shell and intentionally does not
implement Agents or Zhihu API calls.

## Planned boundaries

- `src/app/`: routes and page composition.
- `src/components/`: reusable UI components.
- `src/core/`: product-domain logic, isolated from external services.
- `src/integrations/`: adapters for the official Zhihu Skill and an LLM provider.
- `src/demo-data/`: deterministic local data for demonstrations.
- `src/types/`: shared domain types.
- `src/config/`: environment and application configuration.

## Runtime direction

Future tasks should activate short-lived, task-specific workflows from Next.js
route handlers. No long-running User Agent or separate backend service is
planned.
