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
      <Button
        variant="outline"
        color="red"
        radius={999}
        fz={11}
        fw={700}
        tt="uppercase"
        onClick={() => setAsking(true)}
        style={{ borderWidth: 1.5, letterSpacing: '0.1em', backgroundColor: 'transparent' }}
      >
        {label}
      </Button>

      {/* The one dialog in the app that does not look like the others. The
          explanations are plum; this one is berry, edge to edge, because
          everything irreversible goes through it and it should not be
          mistaken for something being explained. */}
      <Modal
        opened={asking}
        onClose={() => setAsking(false)}
        title={label}
        centered
        size="sm"
        radius="lg"
        styles={{
          content: {
            border: '2px solid var(--mantine-color-red-filled)',
            boxShadow: '4px 4px 0 var(--mantine-color-red-filled)',
          },
          header: {
            backgroundColor: 'var(--mantine-color-red-filled)',
            color: 'var(--mantine-color-white)',
          },
          title: {
            fontFamily: 'Bungee, sans-serif',
            fontWeight: 400,
            fontSize: 12,
            textTransform: 'uppercase',
          },
          close: {
            border: '1.5px solid currentColor',
            borderRadius: 999,
            color: 'var(--mantine-color-white)',
          },
        }}
        transitionProps={{ duration: 0 }}
      >
        <Text size="sm" mb="md">
          {question}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button
            variant="outline"
            color="red"
            radius={999}
            fz={11}
            fw={700}
            tt="uppercase"
            onClick={() => setAsking(false)}
            style={{ borderWidth: 1.5, letterSpacing: '0.1em', backgroundColor: 'transparent' }}
          >
            {cancelLabel}
          </Button>
          <Button
            color="red"
            radius={999}
            className="ws-pressable"
            fz={11}
            fw={700}
            tt="uppercase"
            style={{ letterSpacing: '0.1em' }}
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
