Run a comprehensive review of recent changes using all 5 review agents.

First, identify what changed by running `git diff --name-only HEAD` and `git diff --cached --name-only` in the project. Combine the results into a single list of changed files. If there are no changes, also check `git diff --name-only HEAD~1` to review the last commit.

Then launch ALL 5 agents in parallel using the Agent tool, passing each one the list of changed files to scope their review:

1. **security** agent — scans for vulnerabilities (auth guards, data leaks, input validation, XSS)
2. **design** agent — checks UI consistency (token adherence, component reuse, accessibility, responsive)
3. **tester** agent — writes and runs tests for changed code (edge cases, new features)
4. **oracle** agent — reviews architecture (separation of concerns, dependencies, file sizes, patterns)
5. **performance** agent — analyzes performance (bundle size, re-renders, lazy loading, memory)

After all agents complete, present a unified summary:

```
## Review Summary

| Agent        | Status | Key Findings |
|-------------|--------|--------------|
| Security    | pass/warn/fail | [1-line summary] |
| Design      | pass/warn/fail | [1-line summary] |
| Tester      | pass/warn/fail | [1-line summary] |
| Oracle      | pass/warn/fail | [1-line summary] |
| Performance | pass/warn/fail | [1-line summary] |

### Action Items
- [ ] [Critical items that should be fixed before committing]
- [ ] [Important items to address soon]
- [ ] [Nice-to-have improvements]
```

Status guide:
- **pass**: No issues found or only informational notes
- **warn**: Minor issues found that don't block commit
- **fail**: Critical or high-severity issues that should be fixed before committing
