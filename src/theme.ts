import { createTheme, type MantineColorsTuple, type MantineThemeOverride } from '@mantine/core'

/** Woodstack '26.
 *
 *  This override deliberately redefines Mantine's OWN palette names — teal,
 *  orange, grape, blue, red — rather than adding brand names beside them.
 *  Every colour in the app is already asked for by those names
 *  (`ProgressRing` asks for `teal`/`orange`, `DryingCurveChart` reads
 *  `--mantine-color-teal-light`, `--mantine-color-orange-filled`,
 *  `--mantine-color-grape-filled`, `--mantine-color-blue-filled`,
 *  `ConfirmButton` asks for `red`), so recolouring the names is the whole
 *  restyle and not one component has to change.
 *
 *  Shade 6 is the light-theme colour and shade 5 the dark-theme one — the
 *  dark screens want the accents a step brighter to hold contrast against
 *  plum night. `primaryShade` below is what picks between them. */

const ember: MantineColorsTuple = [
  '#FDEDE7', '#F9D7CB', '#F3AC94', '#EE8A6B', '#F3714B',
  '#F0623A', // dark-theme filled
  '#E1512A', // light-theme filled
  '#C43F1E', '#A63317', '#87270F',
]

const ochre: MantineColorsTuple = [
  '#FDF4E1', '#F9E6BC', '#F5D68F', '#F3C765', '#F2BB4B',
  '#F2B23C', // dark
  '#E8A32A', // light
  '#C9891C', '#A66F13', '#82560B',
]

const pine: MantineColorsTuple = [
  '#E4F5F3', '#C0E7E3', '#96D6D0', '#68C3BB', '#3EAFA6',
  '#1F9E93', // dark
  '#157F76', // light
  '#0F675F', '#0A5049', '#063A35',
]

const berry: MantineColorsTuple = [
  '#FCEBF2', '#F6CCDC', '#EFA6C1', '#E67FA5', '#DD5F8D',
  '#D4497F', // dark
  '#B8336A', // light
  '#9A2957', '#7C1F45', '#5E1633',
]

/** Plum night. Mantine builds every dark-theme surface, border and dimmed
 *  text out of this one tuple, so the dark screens are these ten values.
 *  4 is the dimmed text, 3 the border, 6 the body background. */
const plumNight: MantineColorsTuple = [
  '#F7EBD3', // text
  '#D9C6B4',
  '#A88F9E',
  '#4A2A44', // borders
  '#3A1F36',
  '#2A1226', // raised surface / header
  '#241428', // paper
  '#1D0F1F',
  '#150A13', // body
  '#0E0610',
]

/** The plum panel: flat, shadowless, cream text. It holds what the app is
 *  telling you, where a cream card with a hard shadow holds what you act on.
 *  Nothing in this app is both. Written once here because the header panel and
 *  the stack page's window both take it. */
export const PLUM_PANEL = 'light-dark(#3A1A38, #2A1226)'

/** The rule that fills the space to the left of, or above, a short label. Two
 *  pixels tall, drawn rather than bordered, so the dashes stay the same length
 *  whatever sits beside them. Written once here because the stack page's
 *  volume line and the comparison screen's figure block both take it. */
export const DASHED_RULE =
  'repeating-linear-gradient(90deg, var(--mantine-color-default-border) 0 6px, transparent 6px 12px)'

/** A field's label: small tracked capitals, dimmed. The same voice the stack
 *  page's meta lines are in, so a thing you type into is labelled the way a
 *  thing you read is. Passed as Mantine's `label` style rather than set on
 *  `Input.Label` globally — the forms this round does not touch keep the
 *  default until they are drawn too. */
export const FIELD_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  color: 'var(--mantine-color-dimmed)',
}

export const theme: MantineThemeOverride = createTheme({
  primaryColor: 'orange',
  primaryShade: { light: 6, dark: 5 },
  colors: { orange: ember, yellow: ochre, teal: pine, grape: berry, blue: pine, red: berry, dark: plumNight },
  white: '#FFF7E6',
  black: '#2E1A0F',
  fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, monospace',
  headings: {
    fontFamily: 'Bungee, Outfit, system-ui, sans-serif',
    fontWeight: '400',
    sizes: {
      h1: { fontSize: '2.125rem', lineHeight: '1.05' },
      h2: { fontSize: '1.5rem', lineHeight: '1.1' },
    },
  },
  radius: { sm: '8px', md: '12px', lg: '20px' },
  /** Hard offsets, no blur: `sm` under a control, `md` under a card. Blur
   *  belongs to the browser's own furniture, not to a poster.
   *  `--mantine-color-default-border` is already bark on the cream theme and a
   *  lighter plum on the dark one, so one value comes out right in both. */
  shadows: {
    sm: '3px 3px 0 var(--mantine-color-default-border)',
    md: '4px 4px 0 var(--mantine-color-default-border)',
  },
  // No `components` block and no `defaultRadius`. The design bundle also draws
  // pill-shaped buttons and tabs and rounded cards, and setting them here would
  // reshape every Button, Tabs and SegmentedControl in the app as a side effect
  // of wiring the palette in. That treatment is its own job.
})

/** The cream page. Mantine's light body colour is white and its light borders
 *  are grey; both are wrong for this palette, and both are one variable. */
export const cssVariablesResolver: Parameters<typeof import('@mantine/core').MantineProvider>[0]['cssVariablesResolver'] = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#F7EBD3',
    '--mantine-color-default': '#FFF7E6',
    '--mantine-color-default-border': '#2E1A0F',
    '--mantine-color-dimmed': '#6B5B4A',
  },
  dark: {
    '--mantine-color-body': '#150A13',
    '--mantine-color-default': '#241428',
    '--mantine-color-default-border': '#4A2A44',
    '--mantine-color-dimmed': 'rgba(247, 235, 211, 0.62)',
  },
})
