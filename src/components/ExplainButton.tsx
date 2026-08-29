import { useState, type CSSProperties } from 'react'
import { Group, Input, Modal, Text, UnstyledButton } from '@mantine/core'

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
  /** How far across the mark is drawn. 20 next to a field label, 22 in a line
   *  of text, 24 on the plum panel — the three places the design puts it. */
  size?: number
}

export function ExplainButton({ title, body, size = 20 }: Props) {
  const [opened, setOpened] = useState(false)

  return (
    <>
      {/* An outline circle rather than Mantine's subtle `ActionIcon`, which
          has no fill and no edge and so disappears on cream. The border takes
          the surrounding text's own colour at 60 %, which is what makes the
          same mark work on the cream page and on the plum panel without
          knowing which one it is standing on. The "?" stays in the body face:
          Bungee's question mark is too heavy at this size. */}
      <UnstyledButton
        aria-label={title}
        onClick={() => setOpened(true)}
        style={{
          width: size,
          height: size,
          flex: 'none',
          borderRadius: 999,
          border: '1.5px solid color-mix(in srgb, currentColor 60%, transparent)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: Math.round(size * 0.55),
          lineHeight: 1,
          color: 'inherit',
        }}
      >
        ?
      </UnstyledButton>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={title}
        centered
        size="sm"
        radius="lg"
        // The dialog shape this and `AboutMenu` share: a plum title bar over a
        // cream body, a 2 px border and a hard shadow. Written out in each
        // rather than wrapped in a component of its own — `ConfirmButton` is
        // deliberately the odd one out, and a shared wrapper with an exception
        // in it explains less than two plain copies.
        styles={{
          content: {
            border: '2px solid var(--mantine-color-default-border)',
            boxShadow: 'var(--mantine-shadow-md)',
          },
          header: { backgroundColor: 'light-dark(#3A1A38, #2A1226)', color: 'var(--mantine-color-white)' },
          title: { fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' },
          close: { border: '1.5px solid currentColor', borderRadius: 999, color: 'var(--mantine-color-white)' },
        }}
        transitionProps={{ duration: 0 }}
      >
        <Text size="sm">{body}</Text>
      </Modal>
    </>
  )
}

type LabelProps = Omit<Props, 'size'> & {
  /** The `id` of the field this labels. */
  htmlFor: string
  label: string
  /** Overrides the label's own look. Only `ComparePage` passes this, for the
   *  tracked capitals its fields take; every other caller keeps Mantine's
   *  default label. */
  labelStyle?: CSSProperties
}

/** A field's label with the mark beside it.
 *
 *  The mark cannot go inside the field's own `label` prop: Mantine renders that
 *  into a real `<label>`, and a button nested in a label is read as part of the
 *  field's name — the unit picker would be called «Enhet ?» out loud, and every
 *  query that looks a field up by its label finds the button too. So the label
 *  is rendered here instead, beside the mark rather than around it, and tied to
 *  the field by `htmlFor`. */
export function ExplainedLabel({ htmlFor, label, title, body, labelStyle }: LabelProps) {
  return (
    // `mb`: Mantine's own field label carries this gap to the box below it
    // built in; rendered here rather than through the `label` prop, this one
    // has to say so itself or the field sits flush under the mark.
    <Group gap={4} wrap="nowrap" mb={4}>
      <Input.Label htmlFor={htmlFor} style={labelStyle}>
        {label}
      </Input.Label>
      <ExplainButton title={title} body={body} />
    </Group>
  )
}
