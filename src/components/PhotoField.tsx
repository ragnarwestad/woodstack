import { useState } from 'react'
import { Alert, FileInput, Group, Image, rem, Stack as MantineStack } from '@mantine/core'
import { resizePhoto } from '../media/photo'
import { useTranslation } from '../i18n/useTranslation'
import { ConfirmButton } from './ConfirmButton'

type Props = {
  value: string | undefined
  onChange: (photo: string | undefined) => void
  /** Injectable the same way `geocodeFn` and `getNormalsFn` are on the two
   *  stack forms: production draws to a real canvas, tests hand in a fake, so
   *  no test depends on rendering the environment cannot do. */
  resizeFn?: (file: File) => Promise<string>
}

/** One photo of the stack: take it, look at it, take a different one, or take
 *  it off again. Shared by the add and the edit screen, because a stack
 *  written down without a photo would otherwise have no way of getting one.
 *
 *  `capture="environment"` is what opens the camera straight away on a phone,
 *  pointing away from the visitor — the pile is in front of them. On a desktop
 *  the browser ignores it and shows an ordinary file picker. */
/** The picture itself, shown wherever the caller puts it — beside the save and
 *  cancel buttons, in the add form. Kept out of the field on purpose: under the
 *  field it added height the moment a photo arrived, and everything below it
 *  moved down the page while the visitor was still filling the form in. */
export function PhotoPreview({ value, onChange }: Pick<Props, 'value' | 'onChange'>) {
  const { t } = useTranslation()
  if (!value) return null

  return (
    // Big enough to actually look at — a thumbnail answers "is one attached",
    // not "is this the right pile". Centred in whatever space it is given.
    // `w="100%"`: without a width of its own the row is only as wide as the
    // picture, and centring inside it centres nothing.
    <Group gap={4} wrap="nowrap" align="flex-start" justify="center" w="100%">
      <Image src={value} alt={t('photo.alt')} h={rem(140)} w="auto" fit="contain" radius="sm" />
      {/* Asked for, like every other delete in this app: the photo is gone for
          good once it goes, and the same click that removes it is the one right
          next to the picture the visitor is looking at. */}
      <ConfirmButton
        label={t('photo.remove')}
        question={t('photo.removeQuestion')}
        confirmLabel={t('common.ok')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => onChange(undefined)}
      />
    </Group>
  )
}

/** The control that takes a photo. `value` is part of the props so callers can
 *  hand the same object to both halves, but the field does not show the photo
 *  — `PhotoPreview` does, wherever the caller has room for it. */
export function PhotoField({ onChange, resizeFn = resizePhoto }: Props) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)

  async function pick(file: File | null) {
    if (!file) return
    setFailed(false)
    try {
      onChange(await resizeFn(file))
    } catch {
      // The rejection happens inside an event handler, where nothing else is
      // waiting to catch it. Saying so beats a picker that looks like it did
      // nothing at all — and the photo already there is left alone.
      setFailed(true)
    }
  }

  return (
    <MantineStack gap="xs">
      <FileInput
        label={t('photo.label')}
        description={t('photo.description')}
        placeholder={t('photo.placeholder')}
        accept="image/*"
        capture="environment"
        value={null}
        onChange={pick}
      />

      {failed && <Alert color="red">{t('photo.failed')}</Alert>}
    </MantineStack>
  )
}
