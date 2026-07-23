# Contributing to Stet

Thanks for your interest in Stet. Please read this before opening a pull request.

## How this project is run

Stet is built by a **single maintainer** with an opinionated vision for what it should (and shouldn’t) be. Every change is reviewed and merged by the maintainer — `main` is protected and nothing lands without that review.

That means:

- **Pull requests are welcome, but not guaranteed to be merged.** Scope, direction, and design are the maintainer’s call.
- **Open an issue before writing a PR.** Describe the bug or the feature and wait for a 👍 before investing real time. Unsolicited large PRs will likely be declined regardless of quality — please don’t spend a weekend on a surprise.
- **Small, focused fixes** (a clear bug, a typo, a broken link) can go straight to a PR.

If you want Stet to do something it doesn’t, the fastest path is usually to **fork it** — the AGPL license explicitly protects your right to do that.

## Ground rules for any change

All code must follow the constitution in **[AGENTS.md](AGENTS.md)** — architecture, naming, component limits, the no-shadows design rule, and the TypeScript bar. A change that violates a rule there won’t be merged; restructure the change instead of bending the rule.

Before you push, every one of these must pass with **zero new warnings**:

```bash
npm run lint
npm run build
npm test
```

- Keep the diff minimal and match the surrounding style.
- No new dependencies without strong justification (this project must stay auditable).
- Don’t build ahead of the roadmap in `plan.md` / `execution-plan.md`.
- Tests live beside the code as `*.test.ts` and run under Vitest.

## Reporting bugs

Open an issue with: what you did, what you expected, what happened, and your OS/browser. If it involves your documents, remember they live in `~/Stet` (or `$STET_DATA_DIR`) — never paste private content you don’t want public.

## Security

Found something sensitive (a way to leak an API key, path traversal in the file routes, etc.)? **Don’t open a public issue.** Report it privately to the maintainer first.

## License of contributions

By submitting a contribution you agree it is licensed under the project’s [AGPL-3.0](LICENSE).
