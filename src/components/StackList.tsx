import { Button, Group, Image, Paper, Stack as MantineStack, Text, UnstyledButton } from '@mantine/core'
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
  today?: Date
}

export function StackList({ stacks, normalsFor, onSelect, onDelete, onAdd, today = new Date() }: Props) {
  const translator = useTranslation()
  const { t } = translator

  return (
    <MantineStack gap="md">
      <Group justify="space-between">
        {/* Bungee here and on the button: both are short labels nobody wrote,
            which is the whole of the rule for where the display face goes. */}
        <Text ff="Bungee, sans-serif" fw={400} fz={15} tt="uppercase">
          {t('stackList.heading')}
        </Text>
        <Button
          onClick={onAdd}
          radius={999}
          className="ws-pressable"
          ff="Bungee, sans-serif"
          fz={12}
          tt="uppercase"
        >
          {t('stackList.add')}
        </Button>
      </Group>

      {stacks.length === 0 ? (
        <Text c="dimmed">{t('stackList.empty')}</Text>
      ) : (
        stacks.map((stack) => (
          <StackRow
            key={stack.id}
            stack={stack}
            normals={normalsFor(stack)}
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
  today,
  onSelect,
  onDelete,
  translator,
}: {
  stack: Stack
  normals: ClimateNormals | null
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
            {/* Names are what a visitor has to hold in their head to tell three
                woodpiles apart; a photo of the pile does that at a glance. Only
              for the stacks that have one — a placeholder would take the same
                room and say nothing. */}
            {stack.photo && <Image src={stack.photo} alt={t('photo.alt')} w={56} h={56} radius="sm" fit="cover" />}
            <MantineStack gap={2}>
              {/* Not Bungee. It draws capitals only, so "Test Stabel, søsteren
                  til Fredrik" came out shouting — and a stack's name is the
                  visitor's own words, often a whole sentence. Bungee stays
                  where the design put it and where it belongs: the wordmark,
                  headings, buttons and tabs, all of them short. */}
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

        <ConfirmButton
          label={t('stackList.delete')}
          question={t('stackList.deleteQuestion', { name: stack.name })}
          confirmLabel={t('common.ok')}
          cancelLabel={t('common.cancel')}
          onConfirm={onDelete}
        />
      </Group>
    </Paper>
  )
}
