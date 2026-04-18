# GIT_WORKFLOW_NOTES

Incident log and reproducible safeguard patterns for git operations on this
repo. Written in response to near-miss events; add entries as they occur.

---

## 2026-04-18 — Detached HEAD near-miss during v442 recovery

### Incident

During the v442 fix (off-by-one in `_dungVigGrads`), I was about to run
`git commit` on what I believed was `main`. Pre-commit sanity check
(`git status`) revealed:

```
HEAD detached at f5df129
```

`f5df129` is the last pre-Phase-B commit. Had I committed, the resulting
commit would have been a dangling tip on a detached HEAD — invisible from
`main`, effectively reverting v440 (build.js token logic), v440b (generated
`00-tokens.js`), v441 (`_FLOOR_NAMES_UC/_TC` rename), and b44249e
(`docs/BUILD_LINT_TODO.md`). Reflog would have been the only way back.

### Root cause

Earlier in the session I ran `git checkout f5df129` to browser-verify a
pre-B1 state while investigating whether Phase B1 had introduced the
`_FLOOR_NAMES` bug. The verification confirmed the bug pre-existed Phase B1.
I then continued working — editing `src/07-map.js`, running `node build.js`,
staging files — **without ever running `git checkout main` to return**.

The detached state survived because:
- No tool I used complained (`edit`, `node build.js`, `git add`, `git diff`
  all work on detached HEAD).
- `git status` without `--short` shows the detached-HEAD banner prominently,
  but I had been using `git status --short` which only lists modified files.
- Visual reminders (terminal prompt, editor status bar) are easy to miss
  mid-flow.

### How it was caught

A secondary signal, not a primary check:

After running `node build.js`, the output read `Modules: 17 files` instead
of the expected `Modules: 18 files` (the Phase B1 token module). That
discrepancy was the trigger to run `git log --oneline -5` and `git status`
(full, not `--short`), which surfaced the detached HEAD.

Without the Phase B1 module-count invariant, the detached HEAD would likely
have been discovered only after the bad commit was made.

### Recovery

1. `git stash push -u -m "v442 edit on detached HEAD"` — preserve the fix
   off the detached tip.
2. `git checkout main` — return to the branch.
3. `git stash drop` — the edit is simple enough to reapply by hand; dropping
   is safer than `git stash pop` which could hit conflicts silently.
4. Reapply the one-line edit on `main`, rebuild, verify `Modules: 18`,
   commit.

### Lessons / reproducible safeguards

**Before any commit**, always run `git status` (no `--short`). The
detached-HEAD banner is the single most important signal this command
carries and it is invisible in `--short`.

**Pattern: pre-commit guard**. Before `git commit`:
```bash
git branch --show-current && git status --short
```
`git branch --show-current` prints empty on detached HEAD. An empty first
line is the fail signal — treat it as a hard stop and do not commit.

**Pattern: after any `git checkout <sha>` or `git bisect`**, immediately
schedule the return. Either:
- Do the verification and return (`git checkout main`) before touching any
  other tool, or
- Use `git worktree add` instead of `git checkout` for the verification
  branch, so the main working tree is never in detached state.

**Pattern: trust invariants from the system under inspection.** The
`Modules: 17` vs `18` discrepancy is what actually caught this. Build-time
invariants (file counts, line counts, artifact hashes) are cheap canaries;
surface them in build output so stale state is loud.

**Anti-pattern**: relying on terminal prompts or editor status bars to
notice detached HEAD. They are passive; a pre-commit check is active.

### User feedback captured

r0ze: "今回は xhigh の慎重さのおかげで事故を回避できた" — explicit praise for
the `git status` check. The detection pattern above should be applied
proactively on every commit, not only when something feels off.
