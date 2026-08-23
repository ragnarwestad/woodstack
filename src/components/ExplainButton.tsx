import { useState } from 'react'
import { ActionIcon, Group, Input, Modal, Text } from '@mantine/core'

/** A «?» next to a number or a field, for the explanation that used to sit
 *  under it until it was thrown away for taking up room. Nothing to read past
 *  when you already know, and an answer within reach when you do not.
 *
 *  A dialog rather than a hover bubble: half the visitors have no pointer to
 *  hover with, and a bubble anchored to a small label in a two-column grid is
 *  the one that gets clipped by the edge of a phone. The same `Modal` as
 *  `ConfirmButton`, and for the same reasons — it traps focus, closes on
 *  Escape or a tap outside, and brings its own labelled close button.
 *
 *  The title doubles as the mark's accessible name: «?» on its own tells a
 *  screen reader nothing, and one string per explanation beats two that can
 *  drift apart. */

type Props = {
  title: string
  body: string
}

export function ExplainButton({ title, body }: Props) {
  const [opened, setOpened] = useState(false)

  return (
    <>
      <ActionIcon
        variant="subtle"
        color="gray"
        radius="xl"
        size="sm"
        aria-label={title}
        onClick={() => setOpened(true)}
      >
        ?
      </ActionIcon>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={title}
        centered
        size="sm"
        transitionProps={{ duration: 0 }}
      >
        <Text size="sm">{body}</Text>
      </Modal>
    </>
  )
}

type LabelProps = Props & {
  /** The `id` of the field this labels. */
  htmlFor: string
  label: string
}

/** A field's label with the mark beside it.
 *
 *  The mark cannot go inside the field's own `label` prop: Mantine renders that
 *  into a real `<label>`, and a button nested in a label is read as part of the
 *  field's name — the unit picker would be called «Enhet ?» out loud, and every
 *  query that looks a field up by its label finds the button too. So the label
 *  is rendered here instead, beside the mark rather than around it, and tied to
 *  the field by `htmlFor`. */
export function ExplainedLabel({ htmlFor, label, title, body }: LabelProps) {
  return (
    <Group gap={4} wrap="nowrap">
      <Input.Label htmlFor={htmlFor}>{label}</Input.Label>
      <ExplainButton title={title} body={body} />
    </Group>
  )
}
