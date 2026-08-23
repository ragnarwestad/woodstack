import { SCHEMA_VERSION, type AppState, type Stack } from './schema'

/** Export and import of the whole state, and the three namespaced hashes the
 *  app routes on.
 *
 *  The payload travels in the URL fragment, never the query string: fragments
 *  are not sent in the HTTP request, so a visitor's stacks never reach any
 *  host's access log. There is no backend to send them to either — this is
 *  the only backup this app has, which is why the button that produces it is
 *  always one click away. */

const IMPORT_PREFIX = 'i='
const STACK_PREFIX = 's='

/** The one screen that belongs to no stack and carries no payload, so it is a
 *  bare marker rather than a third prefix with nothing after it. */
const COMPARE_HASH = '#compare'

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(payload: string): string {
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function exportState(stacks: Stack[]): string {
  const state: AppState = { version: SCHEMA_VERSION, stacks }
  return toBase64Url(JSON.stringify(state))
}

export function importState(payload: string): Stack[] {
  let state: AppState
  try {
    state = JSON.parse(fromBase64Url(payload)) as AppState
  } catch {
    throw new Error('Lenken kunne ikke leses')
  }

  if (state?.version !== SCHEMA_VERSION || !Array.isArray(state.stacks)) {
    throw new Error('Lenken er laget med en annen versjon av Woodstack')
  }
  return state.stacks
}

/** A share link: the current page, with the state in the fragment. Any hash
 *  the page already had is replaced — a link carries one thing at a time. */
export function buildShareLink(stacks: Stack[], baseUrl: string): string {
  const withoutHash = baseUrl.split('#')[0]
  return `${withoutHash}#${IMPORT_PREFIX}${exportState(stacks)}`
}

/** The hash carries three unrelated things — which stack is open, an incoming
 *  share payload, and the comparison screen — so each is namespaced and none
 *  can be read as another. */
export function readImportPayload(hash: string): string | null {
  const value = hash.replace(/^#/, '')
  return value.startsWith(IMPORT_PREFIX) ? value.slice(IMPORT_PREFIX.length) : null
}

export function readStackId(hash: string): string | null {
  const value = hash.replace(/^#/, '')
  return value.startsWith(STACK_PREFIX) ? value.slice(STACK_PREFIX.length) : null
}

export function stackHash(id: string): string {
  return `#${STACK_PREFIX}${id}`
}

export function isCompareHash(hash: string): boolean {
  return hash === COMPARE_HASH
}

export function compareHash(): string {
  return COMPARE_HASH
}
