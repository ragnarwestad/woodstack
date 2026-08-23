import { Button, Group, Image, Paper, Stack as MantineStack, Text, UnstyledButton } from '@mantine/core'
import type { ClimateNormals, Stack } from '../storage/schema'
import { dryingProgress, estimateWindow } from '../model/simulate'
import { formatWindow } from '../model/units'
import { speciesLabel } from '../model/species'
import { useTranslation, type Translator } from '../i18n/useTranslation'
import { ConfirmButton } from './ConfirmButton'
import { ProgressRing } from './ProgressRing'

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
        <Text fw={600}>{t('stackList.heading')}</Text>
        <Button onClick={onAdd}>{t('stackList.add')}</Button>
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

  return (
    // The row is not one big button any more: a delete inside a button is not
    // valid markup. The card opens the stack, the button beside it removes it,
    // and they are siblings.
    <Paper withBorder p="md" radius="md">
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
              {/* Bungee is a display face with one drawn weight; asking for a
                  bold it does not have would leave the browser to fake one. */}
              <Text ff="Bungee, sans-serif" fw={400}>{stack.name}</Text>
                <Text size="sm" c="dimmed">
                {speciesLabel(stack, t)}
                </Text>
              {window ? (
                <Text size="sm">{t('common.readyBetween', { window: formatWindow(window, translator) })}</Text>
              ) : (
                <Text size="sm" c="dimmed">
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
