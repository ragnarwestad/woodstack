import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createTranslator, useTranslation } from './useTranslation'
import { SPECIES_IDS } from '../model/species'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

describe('useTranslation', () => {
  it('looks up the Norwegian string when the browser speaks Norwegian', () => {
    const { result } = renderHook(() => useTranslation())
    expect(result.current.language).toBe('nb')
    expect(result.current.t('species.bjork')).toBe('Bjørk')
  })

  it('looks up the English string when the browser speaks anything else', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    const { result } = renderHook(() => useTranslation())
    expect(result.current.language).toBe('en')
    expect(result.current.t('species.bjork')).toBe('Birch')
  })

  it('substitutes every placeholder it is given', () => {
    const { result } = renderHook(() => useTranslation())
    expect(result.current.t('logReading.rangeError', { min: 5, max: 200 })).toContain('5')
    expect(result.current.t('logReading.rangeError', { min: 5, max: 200 })).toContain('200')
    expect(result.current.t('logReading.rangeError', { min: 5, max: 200 })).not.toContain('{')
  })

  it('leaves a string without placeholders exactly as written', () => {
    const { result } = renderHook(() => useTranslation())
    expect(result.current.t('stackList.add')).toBe('Ny stabel')
  })

  it('keeps the same language for the lifetime of a render tree', () => {
    const { result, rerender } = renderHook(() => useTranslation())
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    rerender()
    expect(result.current.language).toBe('nb')
  })
})

describe('species names', () => {
  const nb = createTranslator('nb')
  const en = createTranslator('en')

  it('names every species the model knows, in both languages', () => {
    for (const id of SPECIES_IDS) {
      expect(nb.t(`species.${id}`).length).toBeGreaterThan(0)
      expect(en.t(`species.${id}`).length).toBeGreaterThan(0)
    }
  })

  it('does not leave a Norwegian species name standing in the English UI', () => {
    for (const id of SPECIES_IDS) {
      expect(en.t(`species.${id}`)).not.toBe(nb.t(`species.${id}`))
    }
  })
})
