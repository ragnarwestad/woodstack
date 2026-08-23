import { useEffect, useState } from 'react'
import { Alert, Button, Group, Stack as MantineStack, Text } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'
import { isIos, isStandalone } from '../platform'

/** Offers to put the app on the home screen, and says what that gets you: it
 *  opens like any other app and works without a connection.
 *
 *  It used to argue from Safari's seven-day storage eviction. That is real, but
 *  it is an iOS problem, and this web app exists for the people who do NOT have
 *  the iOS app — so the warning spoke past almost everyone who reads it.
 *
 *  iOS never fires `beforeinstallprompt`, so waiting for that event there would
 *  show iOS visitors nothing at all. They get the static instruction instead —
 *  which names the share sheet rather than Safari, since every browser on iOS
 *  installs the same way. */

type InstallEvent = Event & { prompt?: () => Promise<unknown> }

type Props = {
  /** Overridable so a test does not have to fake the platform globally. */
  standalone?: boolean
  ios?: boolean
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
        <Text size="sm">{t('install.reason')}</Text>
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
