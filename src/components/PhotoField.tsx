import { useState } from 'react'
import { Alert, Button, FileInput, Group, Image, Stack as MantineStack } from '@mantine/core'
import { resizePhoto } from '../media/photo'
import { useTranslation } from '../i18n/useTranslation'

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
export function PhotoField({ value, onChange, resizeFn = resizePhoto }: Props) {
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

      {value && (
        <Group align="flex-start" gap="sm">
          <Image src={value} alt={t('photo.alt')} w={120} radius="sm" />
          <Button variant="subtle" onClick={() => onChange(undefined)}>
            {t('photo.remove')}
          </Button>
        </Group>
      )}

      {failed && <Alert color="red">{t('photo.failed')}</Alert>}
    </MantineStack>
  )
}
