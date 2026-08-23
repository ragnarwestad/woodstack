import ts from 'typescript'

/** Bungee is never set below this. Above it the display face was drawn to
 *  work; below it its single weight, tight counters and capitals-only
 *  alphabet stop being read and start being recognised by shape. */
export const BUNGEE_FLOOR_PX = 16

/** The root font size the app runs at — it sets none of its own, so `rem`
 *  means the browser default. */
const PX_PER_REM = 16

/** The rule is checked in two places because no single one can see all of it.
 *
 *  A size written into a `styles={{ ... }}` object reaches the DOM as a plain
 *  `font-size: 10px`, which `assertNoBungeeBelow16` reads off the rendered
 *  tree. A size written as Mantine's `fz` prop does not: `fz={13}` compiles to
 *  `calc(0.8125rem * var(--mantine-scale))`, and happy-dom rejects that value
 *  outright — it never reaches the element's style at all, and
 *  `getComputedStyle` answers with the inherited 16 px instead. A tree walk
 *  therefore cannot tell an `fz={13}` from an `fz={17}`, so those sites are
 *  checked where their size IS written down: in the source, by
 *  `bungeeSitesBelow16`. */

function pxOf(value: string | number | undefined): number | null {
  if (value === undefined) return null
  if (typeof value === 'number') return value
  const rem = /^([\d.]+)rem$/.exec(value.trim())
  if (rem) return Number(rem[1]) * PX_PER_REM
  const px = /^([\d.]+)(px)?$/.exec(value.trim())
  if (px) return Number(px[1])
  return null
}

/* ------------------------------------------------------------------ */
/* The rendered tree                                                   */
/* ------------------------------------------------------------------ */

/** The declared value of one property in an element's own `style` attribute,
 *  or undefined when the element declares none. Read from the attribute
 *  rather than through `getComputedStyle`, which answers with an inherited
 *  default for a property nobody set and would pass an unmeasured element
 *  off as a measured one. */
function declared(element: Element, property: string): string | undefined {
  const style = element.getAttribute('style')
  if (!style) return undefined
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:([^;]*)`, 'i').exec(style)
  return match ? match[1].trim() : undefined
}

/** Walks `root` and fails on any element that asks for Bungee at a declared
 *  size below the floor. An element whose size is not declared in the DOM is
 *  passed over — see the note above on `fz`; `bungeeSitesBelow16` is what
 *  covers those. */
export function assertNoBungeeBelow16(root: ParentNode): void {
  for (const element of root.querySelectorAll('*')) {
    if (!/bungee/i.test(declared(element, 'font-family') ?? '')) continue
    const size = pxOf(declared(element, 'font-size'))
    if (size === null || size >= BUNGEE_FLOOR_PX) continue
    throw new Error(
      `Bungee at ${size}px on <${element.tagName.toLowerCase()}> "${element.textContent?.slice(0, 40)}" — ` +
        `the floor is ${BUNGEE_FLOOR_PX}px`,
    )
  }
}

/* ------------------------------------------------------------------ */
/* The source                                                          */
/* ------------------------------------------------------------------ */

export type BungeeSite = {
  line: number
  /** The size the site declares, or null when it declares none — which is a
   *  break of the rule in itself, since nothing may ask for Bungee without
   *  saying how big. */
  sizePx: number | null
}

/** A JSX attribute's or object property's value, when it is a literal. */
function literalOf(node: ts.Node | undefined): string | number | undefined {
  if (!node) return undefined
  if (ts.isJsxExpression(node)) return literalOf(node.expression)
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  return undefined
}

function jsxProp(node: ts.JsxOpeningLikeElement, name: string) {
  const attribute = node.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  )
  return literalOf(attribute?.initializer)
}

function objectProp(node: ts.ObjectLiteralExpression, name: string) {
  const property = node.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) && candidate.name.getText().replace(/['"]/g, '') === name,
  )
  return literalOf(property?.initializer)
}

/** Every place in `source` that asks for Bungee at less than the floor — or
 *  without saying at what size. One site is one JSX tag or one style object:
 *  the size that governs a `ff="Bungee"` is the `fz` written beside it, and
 *  the one that governs a `fontFamily: 'Bungee'` is the `fontSize` written
 *  beside it. */
export function bungeeSitesBelow16(source: string, fileName: string): BungeeSite[] {
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const sites: BungeeSite[] = []

  const record = (node: ts.Node, family: string | number | undefined, size: string | number | undefined) => {
    if (typeof family !== 'string' || !/^bungee\b/i.test(family.trim())) return
    const sizePx = pxOf(size)
    if (sizePx !== null && sizePx >= BUNGEE_FLOOR_PX) return
    sites.push({ line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1, sizePx })
  }

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningLikeElement(node)) record(node, jsxProp(node, 'ff'), jsxProp(node, 'fz'))
    else if (ts.isObjectLiteralExpression(node))
      record(node, objectProp(node, 'fontFamily'), objectProp(node, 'fontSize'))
    ts.forEachChild(node, visit)
  }
  visit(tree)

  return sites
}
