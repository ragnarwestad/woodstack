import { useState } from 'react'
import { Alert, Button, Group, Stack as MantineStack, Text, TextInput } from '@mantine/core'
import { MOISTURE_BASIS_LABEL } from '../model/units'

/** A meter reading is worth more than any refinement of the species table,
 *  so entering one is two fields and a button. */

const MIN_MOISTURE = 5
const MAX_MOISTURE = 200

type Props = {
  onLog: (reading: { date: string; moisture: number }) => void
}

export function LogReadingForm({ onLog }: Props) {
  const [moisture, setMoisture] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const value = Number(moisture)
    if (!Number.isFinite(value) || value < MIN_MOISTURE || value > MAX_MOISTURE) {
      setError(`Fuktigheten må være mellom ${MIN_MOISTURE} og ${MAX_MOISTURE} %.`)
      return
    }
    setError(null)
    onLog({ date, moisture: value })
    setMoisture('')
  }

  return (
    <MantineStack gap="sm">
      <Text fw={600}>Har du målt stabelen?</Text>

      <TextInput
        type="number"
        label="Fuktighet"
        description={`Prosent av ${MOISTURE_BASIS_LABEL} – tallet måleren viser`}
        value={moisture}
        onChange={(event) => setMoisture(event.currentTarget.value)}
      />

      <TextInput
        type="date"
        label="Målt dato"
        value={date}
        onChange={(event) => setDate(event.currentTarget.value)}
      />

      {error && <Alert color="red">{error}</Alert>}

      <Group>
        <Button onClick={submit}>Lagre måling</Button>
      </Group>
    </MantineStack>
  )
}
