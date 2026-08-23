/** Turning a phone photo into something that fits in `localStorage`.
 *
 *  Everything this app stores shares one ~5 MB quota and travels whole in every
 *  share link, and a photo straight off a camera is 2-5 MB on its own. So the
 *  photo is redrawn small before it is stored, and the original is not kept:
 *  the job is telling one woodpile from another, not archiving the pile.
 *
 *  Only `computeTargetSize` is exercised by the unit suite — the test
 *  environment is `happy-dom`, which has no rasterizing 2D canvas, so what
 *  `resizePhoto` actually draws is a manual check on a real device. That is why
 *  the size decision is a pure function of its own rather than four lines
 *  inside the canvas code. */

/** The long edge a stored photo is capped to. Enough to recognise a woodpile,
 *  small enough that a handful of photographed stacks stays well inside the
 *  quota. */
export const MAX_PHOTO_DIMENSION = 600

const JPEG_QUALITY = 0.7

/** Never upscales: a photo already smaller than the cap is left as it is,
 *  since blowing it up costs bytes and adds no detail that was not there. */
export function computeTargetSize(
  width: number,
  height: number,
  maxSize = MAX_PHOTO_DIMENSION,
): { width: number; height: number } {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxSize) return { width, height }

  const scale = maxSize / longEdge
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Loads `file` as something a canvas can draw.
 *
 *  `imageOrientation: 'from-image'` applies the photo's own EXIF rotation
 *  first — without it a portrait photo off a phone is stored lying on its side,
 *  which is exactly the case this feature exists for. `createImageBitmap` is
 *  missing from some older WebViews an installed app can end up running inside;
 *  those fall back to a plain `Image`, which draws at whatever orientation the
 *  file carries. A sideways photo in that one path beats no photo at all. */
async function loadDrawable(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Draws `file` at the capped size and hands back a JPEG data URL. */
export async function resizePhoto(file: File): Promise<string> {
  const source = await loadDrawable(file)
  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  const { width, height } = computeTargetSize(sourceWidth, sourceHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context unavailable')
  context.drawImage(source, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}
