import { useState } from 'react'
import { Button, Group, Modal, Text } from '@mantine/core'

/** Deleting is the only thing in this app nothing can undo — there is no
 *  server copy to fall back on — so it asks first.
 *
 *  The question lives in a dialog rather than in the page. In the page, the
 *  confirm and cancel buttons appeared where the single button had been and
 *  shoved everything around them down; a dialog sits above the page and moves
 *  nothing.
 *
 *  Still not `window.confirm`: that blocks the page, cannot name what is about
 *  to disappear, and a test cannot click through it the way it clicks a button.
 *
 *  Transitions are off so the dialog is there the moment it is asked for —
 *  a confirmation is not somewhere to spend a quarter of a second. */

type Props = {
  label: string
  question: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
}

export function ConfirmButton({ label, question, confirmLabel, cancelLabel, onConfirm }: Props) {
  const [asking, setAsking] = useState(false)

  return (
    <>
      <Button variant="light" color="red" onClick={() => setAsking(true)}>
        {label}
      </Button>

      <Modal
        opened={asking}
        onClose={() => setAsking(false)}
        title={label}
        centered
        size="sm"
        transitionProps={{ duration: 0 }}
      >
        <Text size="sm" mb="md">
          {question}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => setAsking(false)}>
            {cancelLabel}
          </Button>
          <Button
            color="red"
            onClick={() => {
              setAsking(false)
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Modal>
    </>
  )
}
