import { forwardRef, type ReactNode } from 'react'
import { Menu, UnstyledButton, useMantineColorScheme } from '@mantine/core'
import type { MantineColorScheme } from '@mantine/core'
import type { Language } from '../i18n/language'
import { useLanguageChoice, useTranslation } from '../i18n/useTranslation'

/** Theme and language, each an icon with a menu under it — the shape paceup
 *  uses in its own header (`ViewControls.tsx` there).
 *
 *  They were two segmented controls, which is four or five words of chrome
 *  laid across the top of every screen to say something the visitor sets once
 *  and then never touches. An icon says the same and takes the room of a
 *  button.
 *
 *  Every glyph below is drawn here rather than pulled from an icon library,
 *  for the reason `AboutMenu`'s three dots are: a whole package for a handful
 *  of shapes runs against the carefulness that kept the PWA asset generator
 *  out of the dependencies. `currentColor` throughout, so they take the
 *  button's colour in either theme. */

function Sun() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path
        strokeLinecap="round"
        d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"
      />
    </svg>
  )
}

function Moon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

/** Half sun, half moon: the device decides. */
function SunMoon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 7.5a4.5 4.5 0 0 1 0 9Z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="4.5" />
      <path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4" />
    </svg>
  )
}

/** A globe rather than a letter: "A" would be an alphabet this app does not
 *  only speak, and a flag would pick a country over a language. */
function Globe() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  )
}

/** The tick keeps its place when it is invisible, so the labels line up
 *  instead of shifting by its width as the choice moves. */
function Tick({ shown }: { shown: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: shown ? 1 : 0 }}
      aria-hidden="true"
    >
      <path d="m5 12.5 5 5 9-11" />
    </svg>
  )
}

/** The same outline circle as the three dots and the «?», so the header's
 *  three buttons are one family. Mantine's subtle `ActionIcon` has neither
 *  fill nor edge and vanishes on cream.
 *
 *  `forwardRef` is not optional: `Menu.Target` hands its child a ref to anchor
 *  the dropdown to, and a plain function component swallows it — the menu then
 *  never opens at all. */
const IconButton = forwardRef<HTMLButtonElement, { label: string; children: ReactNode }>(
  function IconButton({ label, children, ...others }, ref) {
  return (
    <UnstyledButton
      ref={ref}
      {...others}
      aria-label={label}
      style={{
        width: 30,
        height: 30,
        flex: 'none',
        borderRadius: 999,
        border: '1.5px solid color-mix(in srgb, currentColor 60%, transparent)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'inherit',
      }}
    >
      {children}
    </UnstyledButton>
  )
  },
)

/** The same "one of these is currently picked" row `ThemeControl` and
 *  `LanguageControl` both need — one component instead of two copies. */
function Choice({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <Menu.Item aria-checked={selected} leftSection={<Tick shown={selected} />} fw={selected ? 700 : 400} onClick={onClick}>
      {label}
    </Menu.Item>
  )
}

export function ThemeControl() {
  const { t } = useTranslation()
  // Mantine keeps the choice itself, in its own storage key, and resolves
  // `auto` against the device. Nothing here has to remember anything.
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  const schemes: { value: MantineColorScheme; label: string }[] = [
    { value: 'light', label: t('app.themeLight') },
    { value: 'dark', label: t('app.themeDark') },
    { value: 'auto', label: t('app.themeAuto') },
  ]
  const Icon = colorScheme === 'light' ? Sun : colorScheme === 'dark' ? Moon : SunMoon

  return (
    <Menu position="bottom-end" transitionProps={{ duration: 0 }}>
      <Menu.Target>
        <IconButton label={t('app.theme')}>
          <Icon />
        </IconButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('app.theme')}</Menu.Label>
        {schemes.map(({ value, label }) => (
          <Choice
            key={value}
            selected={value === colorScheme}
            label={label}
            onClick={() => setColorScheme(value)}
          />
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}

/** Each language names itself. A visitor who landed on the wrong one cannot
 *  read the language they are trying to leave, so translating these two labels
 *  would be the one place translation makes the app harder to use. */
const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'nb', label: 'Norsk' },
  { value: 'en', label: 'English' },
]

export function LanguageControl() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguageChoice()

  return (
    <Menu position="bottom-end" transitionProps={{ duration: 0 }}>
      <Menu.Target>
        <IconButton label={t('app.language')}>
          <Globe />
        </IconButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('app.language')}</Menu.Label>
        {LANGUAGES.map(({ value, label }) => (
          <Choice key={value} selected={value === language} label={label} onClick={() => setLanguage(value)} />
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}
