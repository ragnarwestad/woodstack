import { Button, Group, Paper, Stack as MantineStack, Text, UnstyledButton } from '@mantine/core'
import type { ClimateNormals, Stack } from '../storage/schema'
import { estimateWindow, windowProgress } from '../model/simulate'
import { formatWindow } from '../model/units'
import { speciesLabel } from '../model/species'
import { useTranslation, type Translator } from '../i18n/useTranslation'
import { ProgressRing } from './ProgressRing'

type Props = {
  stacks: Stack[]
  /** The cached normals for a stack's location, or null while they are still
   *  being fetched. */
  normalsFor: (stack: Stack) => ClimateNormals | null
  onSelect: (id: string) => void
  onAdd: () => void
  today?: Date
}

export function StackList({ stacks, normalsFor, onSelect, onAdd, today = new Date() }: Props) {
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
  translator,
}: {
  stack: Stack
  normals: ClimateNormals | null
  today: Date
  onSelect: () => void
  translator: Translator
}) {
  const { t } = translator
  const window = normals ? estimateWindow(stack, normals) : null

  return (
    <UnstyledButton onClick={onSelect}>
      <Paper withBorder p="md" radius="md">
        <Group wrap="nowrap">
          <ProgressRing value={window ? windowProgress(window, today) : 0} />
          <MantineStack gap={2}>
            <Text fw={600}>{stack.name}</Text>
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
      </Paper>
    </UnstyledButton>
  )
}
