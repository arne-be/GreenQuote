# Review loop

Every PR goes through the review loop before the user is asked to merge it.

1. **Post a review.** Run `code-review` on the PR and post its findings:
   `gh pr review <n> --comment --body-file <file>`.
2. **Fix the findings** on the same branch, push, and get CI's `check` green.
3. **Post the next review** of the new commits, as in step 1.
4. **Stop** when a review leaves nothing to fix, or after the third review.

Hand these to the user instead of fixing them, each with a one-line reason:

- findings still open after the third review;
- findings that need a decision: a trade-off, a judgement-call smell, or a
  conflict with an ADR or the issue;
- findings you think are wrong;
- a CI failure you cannot fix.

File out-of-scope findings as issues (`docs/agents/issue-tracker.md`) and link
them in the hand-over.

When the loop ends, report the PR's URL with the handed-over findings and stop.
The user says in chat to merge that PR; GitHub cannot record an author's
approval of their own PR. After the hand-over, a later commit that changes the
code starts the loop again.
