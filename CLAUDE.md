@AGENTS.md

## Active Build

**Active build plan: see [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).** Build one step at a time: implement the next unchecked step in its Progress list, verify it against the step's gate, check the box, and commit. Do not start a later step until the current one passes.

## Project Overview

Use a professional tone, use concise and clear wording. You are an expert in marketing and web development. Don’t coddle me, tell me if I am doing something wrong. I am making an app for climbing gyms where users can select a gym and view videos of the climbs in that gym to get the beta for the climbs. The app is for both mobile and desktop.

## Behavioral Guidelines

1. Think Before Coding
   Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask. 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
   Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
   Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
   Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Tech Stack

Framwork: Next.js (App Router)
Language: TypeScript
Styling: Tailwind CSS
Database: Supabase
Auth: Supabase
Package Manager: npm

## Development commands

```bash
npm install     # Install dependencies
npm run dev     # Start development server (localhost:3000)
npm run build   # Build for Production
```

## Project Structure

```
src/
  app/            # Next.js App Router Pages
  comonents/
    landing/      # Page section components
    ui/           # Reusable UI components
  lib/            # Utilities, constants, animations
  styles/         # Global CSS
  public/         # Static assets

```

## Code Conventions

- Use TypeScript for all new files
- Prefer functional components with hooks
- Use Tailwind utility classes for styling - avoid inline styles
- Keep components focused and single-purpose

## What to Avoid

- Do not modify `next.config.ts` without understanding the existing setup
- Do not add dependencies without checking if existing utilities cover the need
