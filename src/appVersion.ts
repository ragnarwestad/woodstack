import { execSync } from 'node:child_process'

/** The version is the last commit's date, read at build time and never written
 *  by hand. A number somebody has to remember to increment is worse than no
 *  number at all: it goes stale silently, and then the one question the About
 *  dialog exists to answer — «which build am I looking at» — gets a confident
 *  wrong answer. The short SHA rides along as the exact disambiguator for the
 *  days when more than one build went out.
 *
 *  Consumed by `vite.config.ts`, which bakes the result in as
 *  `__APP_VERSION__`; the runner is injectable so the no-git path is a real
 *  test rather than a claim (the same shape `openMeteo.ts` uses for `fetch`). */

export type GitRunner = (command: string) => string

function runGitHere(command: string): string {
  return execSync(command, { encoding: 'utf-8' })
}

export function computeAppVersion(runGit: GitRunner = runGitHere): string {
  try {
    const date = runGit('git log -1 --format=%cd --date=short').trim()
    const sha = runGit('git rev-parse --short HEAD').trim()
    if (!date || !sha) return 'dev'
    return `${date} (${sha})`
  } catch {
    // No git on the PATH, no `.git` at all (a source tarball), or a repository
    // without a commit yet. None of those is a reason for the build to fail.
    return 'dev'
  }
}
