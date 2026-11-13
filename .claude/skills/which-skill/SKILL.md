---
name: which-skill
description: Router over every skill in this repo - asks what you are trying to do and names the skill or chain of skills that fits. Use when not sure which skill to reach for, or to see the flow from idea to shipped.
disable-model-invocation: true
argument-hint: "What are you trying to do?"
---

# Which skill

If the argument does not say what the user is trying to get done, ask that one
question. Then name one to three skills, one line each on why, and the order
when it is a chain. Skills marked _(auto)_ load on their own when the work
touches their area.

## From idea to shipped

| Situation                                           | Skill                                             |
| --------------------------------------------------- | ------------------------------------------------- |
| Too big and foggy to spec; open questions first     | `wayfinder`                                       |
| A plan or design to stress-test                     | `grill-me`, or `grill-with-docs` to record terms and decisions |
| Not sure a state model or UI is right; want to see  | `prototype`                                       |
| A fact from outside the repo the decision waits on  | `research`                                        |
| A decision someone else must make                   | `to-questionnaire`                                |
| Agreed in conversation; write it down               | `to-spec`                                         |
| A spec to split into tickets                        | `to-tickets`                                      |
| One ticket or plan to build                         | `implement`                                       |
| A whole spec's tickets                              | `implement-spec`                                  |
| Review a change                                     | `code-review`                                     |
| Write the PR                                        | `pr`                                              |
| Context is full between phases                      | `handoff`                                         |
| Incoming issues to sort                             | `triage`                                          |

## While building

| Situation                                                | Skill                                   |
| -------------------------------------------------------- | --------------------------------------- |
| Build test-first                                         | `tdd`                                   |
| Smallest change, reusing what exists                     | `ponytail`                              |
| Design a module's interface; where a seam goes           | `codebase-design`                       |
| Find refactors that deepen modules                       | `improve-codebase-architecture`         |
| Pin down what a domain word means                        | `domain-modeling`                       |
| Where code lives; deps; lint rules                       | `monorepo-guidelines` _(auto)_          |
| Business rules, services, domain vs app                  | `developing-domain-package` _(auto)_    |
| NestJS modules, controllers, guards                      | `developing-api-app` _(auto)_           |
| Next.js pages, forms, data fetching                      | `developing-nextjs-apps` _(auto)_       |
| Tables, migrations, seed                                  | `managing-database-schema` _(auto)_     |
| TypeScript style and types                               | `developing-typescript` _(auto)_        |
| A read that decides a write                              | `serialising-concurrent-writes`         |
| Lists, loops with I/O, "does this scale?"                | `engineering-scale-readiness`           |

## UI

| Situation                                 | Skill        |
| ----------------------------------------- | ------------ |
| Design, critique or polish an interface   | `impeccable` |
| shadcn components                         | `shadcn`     |

## Something is broken

| Situation                | Skill             |
| ------------------------ | ----------------- |
| A bug or a regression    | `diagnosing-bugs` |

## Writing and explaining

| Situation                                      | Skill                |
| ---------------------------------------------- | -------------------- |
| Prose sounds AI-written (README, PR)           | `humanizer`          |
| Writing a skill, CLAUDE.md or agent prompt     | `writing-for-agents` |
| Explain something visually as HTML             | `show-me`            |
| Learn a concept from this codebase             | `teach`              |
| A message that didn't land                     | `wait-what`          |
| Interactive step-by-step setup                 | `wizard`             |

## Repo setup

| Situation                                       | Skill                        |
| ----------------------------------------------- | ---------------------------- |
| Husky + lint-staged pre-commit                  | `setup-pre-commit`           |
| Block dangerous git commands in Claude Code     | `git-guardrails-claude-code` |
| Switch issue tracker or re-run skill setup      | `setup-matt-pocock-skills`   |
| What went wrong in sessions; what to skillify   | `retro`                      |
| Matt Pocock's own router over his skills        | `ask-matt`                   |
