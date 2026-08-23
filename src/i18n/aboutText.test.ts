import { describe, expect, it } from 'vitest'
import { SERVICE_NAME } from '../climate/openMeteo'
import { nb } from './nb'
import { en } from './en'

/** The Info tab promises that nothing leaves the browser except what goes to
 *  the one outside service the app uses. That promise rots silently: somebody
 *  adds a service, the text stays as it was, and then it is a lie. This is the
 *  ten lines that catch it — the text has to name the service the code itself
 *  names, in every language. */
describe('about.info.body', () => {
  it.each([
    ['nb', nb],
    ['en', en],
  ])('names the outside service the app talks to, in %s', (_language, dictionary) => {
    expect(dictionary['about.info.body']).toContain(SERVICE_NAME)
  })
})
