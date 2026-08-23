import { describe, expect, it } from 'vitest'
import { computeAppVersion } from './appVersion'

describe('computeAppVersion', () => {
  it('formats the commit date and the short SHA', () => {
    const runGit = (command: string) =>
      command.includes('rev-parse') ? 'a1b2c3d\n' : '2026-08-23\n'
    expect(computeAppVersion(runGit)).toBe('2026-08-23 (a1b2c3d)')
  })

  /** A source tarball has no `.git`, and a build machine need not have git on
   *  its PATH at all. Neither is a reason for the build to fail. */
  it('falls back to «dev» when git is not there', () => {
    const runGit = () => {
      throw new Error('git: command not found')
    }
    expect(computeAppVersion(runGit)).toBe('dev')
  })

  it('falls back to «dev» when git answers with nothing', () => {
    expect(computeAppVersion(() => '')).toBe('dev')
  })
})
