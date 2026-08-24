import { Anchor, Container, Group, Paper, Stack, Text, Title } from '@mantine/core'
// The header mark, not the app icon: the icon carries an opaque background
// because a home-screen tile needs one, and on the page that reads as a dark
// square beside the title in the light theme.
import { Logo } from './Logo'
import { useTranslation } from '../i18n/useTranslation'
import { AboutMenu } from './AboutMenu'
import { LanguageControl, ThemeControl } from './ViewControls'
import { PLUM_PANEL } from '../theme'

type Props = {
  /** Back to the list, from wherever the visitor is. It has to come from
   *  `App`: the add and edit screens are plain state there with no hash of
   *  their own, so clearing the URL alone would leave the visitor sitting on
   *  a form. */
  onHome: () => void
}

export function AppHeader({ onHome }: Props) {
  const { t } = useTranslation()


  return (
    // Sticky rather than a scrolling list inside a fixed frame: the page goes
    // on scrolling as it always did, the panel just stays where you can see
    // it — and the stack page gets the same behaviour without being touched.
    //
    // It needs a fill of its own for the reason it always did: a sticky element
    // does not carry the page's paint with it, so without one the cards slide
    // under it and show through. That fill is now the panel's own plum rather
    // than the page background, and the negative margin puts it out to the
    // container's edges, so a card passing beneath is covered rather than
    // clipped down the middle.
    //
    // `overflow: hidden` sits on this same sticky element, which is allowed —
    // it is `overflow` on an ANCESTOR that breaks sticky. It is what clips the
    // ring pattern and the scallop where they overshoot the panel.
    //
    // Square corners, no border, no shadow: this is a panel, not a card, and it
    // bleeds to the screen edge on a phone, where a rounded corner would read
    // as a floating rectangle rather than a full-bleed band.
    <Paper
      className="ws-header"
      pos="sticky"
      top={0}
      radius={0}
      style={{
        zIndex: 2,
        overflow: 'hidden',
        // No side padding of its own: the panel is the full width of the
        // window and the container below holds the content, so the mark and
        // the title line up with the cards at every width. Only the band is
        // edge to edge.
        padding: '22px 0 30px',
        backgroundColor: PLUM_PANEL,
        color: 'var(--mantine-color-white)',
      }}
    >
      <div aria-hidden="true" data-testid="header-rings" className="ws-header-rings" />
      <div aria-hidden="true" data-testid="header-scallop" className="ws-header-scallop" />

      {/* `position: relative` on the container is load-bearing, not cosmetic:
          an absolutely positioned box paints above a static one whatever the
          markup order, so without it the two decorations above would cover the
          content. With it, they are all positioned and DOM order decides —
          rings, then scallop, then this.

          `wrap="wrap"`: the mark, the title and the three buttons do not fit
          on one line on a phone, and the buttons are what should drop to a
          line of their own — not the app's name. */}
      <Container size="sm" px="md" style={{ position: 'relative' }}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Group gap="var(--ws-header-gap)" wrap="nowrap">
          {/* A real `href`, not a button dressed as one: cmd-click and
              middle-click have to open the app in a new tab the way every other
              logo on the web does, and only a left click without modifiers is
              handled in the page. `BASE_URL` rather than a written-out path —
              the app is served from a subdirectory and Vite is the one that
              knows which. */}
          <Anchor
            href={import.meta.env.BASE_URL}
            aria-label={t('app.home')}
            underline="never"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
              event.preventDefault()
              onHome()
            }}
            style={{ display: 'inline-flex', lineHeight: 0 }}
          >
            <Logo h="var(--ws-header-logo-h)" w="var(--ws-header-logo-w)" />
          </Anchor>
          <Stack gap={2}>
            <Title order={1} lh={0.9} style={{ fontSize: 'var(--ws-header-title)' }}>
              Woodstack{' '}
              <Text span inherit c="yellow.6">
                &apos;26
              </Text>
            </Title>
            <Text
              size="xs"
              fw={600}
              tt="uppercase"
              c="yellow.6"
              style={{ letterSpacing: 'var(--ws-header-track)' }}
            >
              {t('app.slogan')}
            </Text>
            {/* Not `c="dimmed"`: that token is tuned against the page's own
                colour, and on the plum panel it computes to about 2.3:1 in the
                light theme. Inherited cream at reduced opacity reads as the
                same quiet line and stays legible — the stack page's plum
                window makes the same swap for its correction caption. */}
            <Text style={{ opacity: 0.7 }}>{t('app.tagline')}</Text>
          </Stack>
        </Group>

        {/* Three buttons of the same size and shape, not two blocks of text and
            a button. Theme and language are set once and then never touched;
            they should not take a line of the header to say so.

            `marginLeft: auto` and not just the parent's `space-between`: once
            these wrap to a line of their own they are the only thing on it,
            and `space-between` puts a lone item at the start — so on the
            narrow screen the wrap was for, they landed on the left. The auto
            margin holds them right on both lines. */}
        <Group gap="xs" wrap="nowrap" style={{ marginLeft: 'auto' }}>
          <ThemeControl />
          <LanguageControl />
          <AboutMenu />
        </Group>
        </Group>
      </Container>
    </Paper>
  )
}
