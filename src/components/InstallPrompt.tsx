import { useEffect, useState } from 'react'
import { Alert, Button, Group, Stack as MantineStack, Text } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'

/** Safari throws away a site's storage after seven days without a visit — and
 *  a firewood app is visited every few months, which is exactly the pattern
 *  that punishes. Installed apps on the home screen are exempt, so this asks
 *  to be installed and says why.
 *
 *  iOS never fires `beforeinstallprompt`, so waiting for that event there
 *  would show iOS visitors nothing at all. They get the static instruction
 *  instead. */

type InstallEvent = Event & { prompt?: () => Promise<unknown> }

type Props = {
  /** Overridable so a test does not have to fake the platform globally. */
  standalone?: boolean
  ios?: boolean
}

function isStandalone(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallPrompt({ standalone = isStandalone(), ios = isIos() }: Props) {
  const { t } = useTranslation()
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (standalone || ios) return

    function capture(event: Event) {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
    }

    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [standalone, ios])

  if (standalone || dismissed) return null
  if (!ios && !installEvent) return null

  return (
    <Alert color="orange">
      <MantineStack gap="xs">
        <Text fw={600}>{t('install.heading')}</Text>
        <Text size="sm">{t('install.eviction')}</Text>
        {ios ? (
          <Text size="sm">{t('install.ios')}</Text>
        ) : null}
        <Group>
          {!ios && installEvent?.prompt && (
            <Button
              onClick={() => {
                void installEvent.prompt?.()
                setDismissed(true)
              }}
            >
              {t('install.install')}
            </Button>
          )}
          <Button variant="subtle" onClick={() => setDismissed(true)}>
            {t('install.close')}
          </Button>
        </Group>
      </MantineStack>
    </Alert>
  )
}
