import { describe, expect, it } from 'vitest'
import { MAX_PHOTO_DIMENSION, computeTargetSize } from './photo'

/** The canvas itself cannot be tested here — `happy-dom` has no rasterizing 2D
 *  context — so the size decision is pulled out into a pure function and
 *  tested on its own. What the canvas then does with those numbers is the
 *  manual, real-device check in the spec. */
describe('computeTargetSize', () => {
  it('caps the long edge and keeps the aspect ratio, landscape', () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ width: MAX_PHOTO_DIMENSION, height: 450 })
  })

  it('caps the long edge and keeps the aspect ratio, portrait', () => {
    expect(computeTargetSize(3000, 4000)).toEqual({ width: 450, height: MAX_PHOTO_DIMENSION })
  })

  // A photo already small enough is left exactly as it is: blowing it up would
  // cost bytes and add no detail that was not there to begin with.
  it('never upscales a photo that is already smaller than the cap', () => {
    expect(computeTargetSize(320, 240)).toEqual({ width: 320, height: 240 })
  })

  it('leaves a photo sitting exactly on the cap alone', () => {
    expect(computeTargetSize(MAX_PHOTO_DIMENSION, 300)).toEqual({ width: MAX_PHOTO_DIMENSION, height: 300 })
  })

  it('takes a cap of its own when one is given', () => {
    expect(computeTargetSize(1000, 500, 100)).toEqual({ width: 100, height: 50 })
  })
})
