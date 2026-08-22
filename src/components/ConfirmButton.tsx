import { useState } from 'react'
import { Button, Group } from '@mantine/core'

/** One click asks, the second one acts. Deleting is the only thing in this app
 *  nothing can undo — there is no server copy to fall back on — so it takes two
 *  deliberate clicks rather than one.
 *
 *  Not `window.confirm`: it blocks the page, it cannot be styled to say what is
 *  about to disappear, and a test cannot click through it the way it clicks a
 *  plain button. */

type Props = {
  label: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
}

export function ConfirmButton({ label, confirmLabel, cancelLabel, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button variant="subtle" color="red" onClick={() => setConfirming(true)}>
        {label}
      </Button>
    )
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <Button color="red" onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button variant="default" onClick={() => setConfirming(false)}>
        {cancelLabel}
      </Button>
    </Group>
  )
}
