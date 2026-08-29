import type { ReactNode } from 'react'
import { Button, Group, Image, Paper, Stack as MantineStack, Text, Title, UnstyledButton } from '@mantine/core'
import type { ClimateNormals, Stack } from '../storage/schema'
import { dryingProgress, estimateWindow } from '../model/simulate'
import { formatWindow } from '../model/units'
import { speciesLabel } from '../model/species'
import { useTranslation, type Translator } from '../i18n/useTranslation'
import { ConfirmButton } from './ConfirmButton'
import { ProgressRing } from './ProgressRing'

/** The species line, in both the list and on the stack page: small capitals,
 *  widely tracked, berry on cream and ochre on plum night. On an inverted card
 *  it goes ochre in either scheme — the card is teal underneath, and berry on
 *  teal is unreadable. */
const SPECIES_LINE = 'light-dark(var(--mantine-color-grape-6), var(--mantine-color-yellow-6))'

type Props = {
  stacks: Stack[]
  /** The cached normals for a stack's location, or null while they are still
   *  being fetched. */
  normalsFor: (stack: Stack) => ClimateNormals | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
  /** The install prompt and the "this one's ready" banners `App` shows above
   *  the list — passed in rather than left above this component so that
   *  nothing stands between the header and the sticky heading row's own
   *  resting position. Anything here scrolls away with the list instead. */
  banner?: ReactNode
  /** Whether the app seeded this stack itself rather than the visitor
   *  entering it. Optional: a list told about no examples says nothing about
   *  any. */
  isExample?: (stack: Stack) => boolean
  today?: Date
}

export function StackList({
  stacks,
  normalsFor,
  onSelect,
  onDelete,
  onAdd,
  banner,
  isExample = () => false,
  today = new Date(),
}: Props) {
  const translator = useTranslation()
  const { t } = translator

  return (
    <MantineStack gap="md">
      {/* Sticky under the header rather than moving into it: `AppHeader`
          publishes its own rendered height as `--ws-header-height` (it
          varies — a narrow screen, a longer language, the tabs coming and
          going all change it), and this row reads that back as its own
          `top` so it stays pinned there instead of scrolling away with the
          list under it. The solid body background is what keeps a row
          sliding past from showing through once this is stuck.

          `align="center"`: the button is taller than the heading, so the row
          takes the button's own height — the heading has to be centred in
          that, not pinned to the top of it, for it to read as vertically
          centred in the row it stands in. */}
      <Group
        justify="space-between"
        align="center"
        style={{
          position: 'sticky',
          top: 'var(--ws-header-height, 0px)',
          zIndex: 1,
          backgroundColor: 'var(--mantine-color-body)',
          // 8px on both sides, not a margin in front of the sticky box: a
          // margin sits outside it, in normal flow, so the row would have to
          // scroll that distance shut before locking — moving again despite
          // `marginTop` below cancelling the container's own gap. Padding is
          // inside the box itself, there or not the row has already stuck.
          // Equal top and bottom is what centres the heading in the row
          // rather than crowding it toward one edge.
          paddingBlock: 8,
          // Pinned to the button's own rendered height (36px) plus this
          // row's own 8+8px padding, rather than left to size itself off the
          // heading alone: the same row on the comparison and the need
          // screens has no button in it, and without this it comes out
          // shorter there than it does here. A literal number, not
          // `var(--button-height-sm)`: Mantine defines that custom property
          // scoped to the button's own root class, so it is only visible to
          // the button's own descendants — not to this row, which is the
          // button's ANCESTOR. Custom properties only cascade downward, so
          // the reference silently failed to resolve and the whole
          // declaration was dropped, doing nothing at any padding value.
          minHeight: 52,
          // Cancels the page container's own `pt="lg"` in full: left in,
          // that gap sat between the header and this row's stuck position,
          // so the row visibly slid up to close it on the first bit of
          // scroll instead of standing still from the very top.
          marginTop: 'calc(var(--mantine-spacing-lg) * -1)',
        }}
      >
        {/* The same `Title order={2}` as the comparison and the need
            calculator's own headings, now that all three sit behind the same
            row of tabs — one heading font across the three, not the list's
            own smaller label beside the button it used to be. */}
        <Title order={2}>{t('stackList.heading')}</Title>
        <Button
          onClick={onAdd}
          radius={999}
          className="ws-pressable"
          fw={700}
          fz={13}
          tt="uppercase"
          style={{ letterSpacing: '0.08em' }}
        >
          {t('stackList.add')}
        </Button>
      </Group>

      {banner}

      {stacks.length === 0 ? (
        <Text c="dimmed">{t('stackList.empty')}</Text>
      ) : (
        stacks.map((stack) => (
          <StackRow
            key={stack.id}
            stack={stack}
            normals={normalsFor(stack)}
            isExample={isExample(stack)}
            today={today}
            onSelect={() => onSelect(stack.id)}
            onDelete={() => onDelete(stack.id)}
            translator={translator}
          />
        ))
      )}
    </MantineStack>
  )
}

function StackRow({
  stack,
  normals,
  isExample,
  today,
  onSelect,
  onDelete,
  translator,
}: {
  stack: Stack
  normals: ClimateNormals | null
  isExample: boolean
  today: Date
  onSelect: () => void
  onDelete: () => void
  translator: Translator
}) {
  const { t } = translator
  const window = normals ? estimateWindow(stack, normals) : null
  const progress = normals ? dryingProgress(stack, normals, today) : 0
  // Dry enough, and the card says so by turning itself inside out. It reads
  // the same number the ring does, so the two can never disagree.
  const ready = progress >= 100

  return (
    // The row is not one big button any more: a delete inside a button is not
    // valid markup. The card opens the stack, the button beside it removes it,
    // and they are siblings.
    <Paper
      withBorder
      p="md"
      radius="lg"
      className="ws-pressable-card"
      data-ready={ready ? 'true' : undefined}
      style={{
        borderWidth: 2,
        ...(ready && {
          backgroundColor: 'light-dark(var(--mantine-color-teal-6), #0F4F4A)',
          borderColor: 'light-dark(var(--mantine-color-teal-8), var(--mantine-color-teal-5))',
          color: 'var(--mantine-color-white)',
        }),
      }}
    >
      <Group wrap="nowrap" align="center" gap="md">
        <UnstyledButton onClick={onSelect} style={{ flex: 1, minWidth: 0 }}>
          <Group wrap="nowrap">
            <ProgressRing value={progress} />
            <MantineStack gap={2}>
              {/* Not Bungee. It draws capitals only, so "Test Stabel, søsteren
                  til Fredrik" came out shouting — and a stack's name is the
                  visitor's own words, often a whole sentence. Bungee stays
                  where it is set at 16 px or more: the wordmark, the headings
                  and the three result lines. */}
              <Text fw={600} size="md" lh={1.25}>
                {stack.name}
              </Text>
              <Text
                fz={12}
                fw={600}
                tt="uppercase"
                style={{
                  letterSpacing: '0.14em',
                  color: ready ? 'var(--mantine-color-yellow-6)' : SPECIES_LINE,
                }}
              >
                {speciesLabel(stack, t)}
              </Text>
              {isExample && (
                <Text fz={11} lh={1.35} c={ready ? undefined : 'dimmed'}>
                  {t('stackList.example')}
                </Text>
              )}
              {window ? (
                <Text size="sm" lh={1.35}>
                  {t('common.readyBetween', { window: formatWindow(window, translator) })}
                </Text>
              ) : (
                <Text size="sm" lh={1.35} c={ready ? undefined : 'dimmed'}>
                  {t('common.loadingClimate')}
                </Text>
              )}
            </MantineStack>
          </Group>
        </UnstyledButton>

        {/* On the right, not beside the ring. A photo of the pile tells three
            woodpiles apart at a glance, and only the stacks that have one get
            it — which on the left pushed their names in and left the list
            unaligned. Here the names all start in the same place. */}
        {stack.photo && <Image src={stack.photo} alt={t('photo.alt')} w={56} h={56} radius="sm" fit="cover" />}

        <ConfirmButton
          label={t('stackList.delete')}
          question={t('stackList.deleteQuestion', { name: stack.name })}
          confirmLabel={t('common.ok')}
          cancelLabel={t('common.cancel')}
          onConfirm={onDelete}
          onFilled={ready}
        />
      </Group>
    </Paper>
  )
}
