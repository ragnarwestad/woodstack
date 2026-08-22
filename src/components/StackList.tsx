import { Button, Group, Paper, Stack as MantineStack, Text, UnstyledButton } from '@mantine/core'
import type { ClimateNormals, Stack } from '../storage/schema'
import { estimateWindow, windowProgress } from '../model/simulate'
import { formatWindow } from '../model/units'
import { SPECIES } from '../model/species'
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
  return (
    <MantineStack gap="md">
      <Group justify="space-between">
        <Text fw={600}>Vedstablene mine</Text>
        <Button onClick={onAdd}>Ny stabel</Button>
      </Group>

      {stacks.length === 0 ? (
        <Text c="dimmed">Ingen vedstabler ennå. Legg inn den første, så regner vi ut når den er tørr.</Text>
      ) : (
        stacks.map((stack) => (
          <StackRow
            key={stack.id}
            stack={stack}
            normals={normalsFor(stack)}
            today={today}
            onSelect={() => onSelect(stack.id)}
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
}: {
  stack: Stack
  normals: ClimateNormals | null
  today: Date
  onSelect: () => void
}) {
  const window = normals ? estimateWindow(stack, normals) : null

  return (
    <UnstyledButton onClick={onSelect}>
      <Paper withBorder p="md" radius="md">
        <Group wrap="nowrap">
          <ProgressRing value={window ? windowProgress(window, today) : 0} />
          <MantineStack gap={2}>
            <Text fw={600}>{stack.name}</Text>
            <Text size="sm" c="dimmed">
              {SPECIES[stack.species].label}
            </Text>
            {window ? (
              <Text size="sm">Klar mellom {formatWindow(window)}</Text>
            ) : (
              <Text size="sm" c="dimmed">
                Henter klimadata for stedet …
              </Text>
            )}
          </MantineStack>
        </Group>
      </Paper>
    </UnstyledButton>
  )
}
