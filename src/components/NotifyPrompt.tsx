import { useState } from 'react'
import { Alert, Button, Group, Stack as MantineStack, Text } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'
import { canRequestNotifications } from '../notifications/readyNotifier'

/** Offers to say when the wood is ready, and says what that gets you before
 *  asking for anything.
 *
 *  It lives on the stack detail screen and nowhere else. A permission dialog on
 *  arrival is the fastest route to a permanent no, and there is nothing to be
 *  told about until the visitor has a stack. Nothing is requested on mount
 *  either: the browser's own dialog only ever opens because the button was
 *  pressed.
 *
 *  A visitor on iOS who has not installed the app sees nothing here — the API
 *  is not theirs to ask for until it is on the home screen. `InstallPrompt` is
 *  what speaks to them instead, which is the other half of the same split. */

type Props = {
  /** Overridable so a test does not have to fake the platform globally. */
  supported?: boolean
}

export function NotifyPrompt({ supported = canRequestNotifications() }: Props) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === 'undefined' ? 'denied' : Notification.permission,
  )

  // Anything other than `default` means the visitor has already answered, and
  // the API gives no way to ask a second time.
  if (!supported || dismissed || permission !== 'default') return null

  return (
    <Alert color="orange">
      <MantineStack gap="xs">
        <Text fw={600}>{t('notify.heading')}</Text>
        <Text size="sm">{t('notify.reason')}</Text>
        <Group>
          <Button onClick={() => void Notification.requestPermission().then(setPermission)}>
            {t('notify.enable')}
          </Button>
          <Button variant="subtle" onClick={() => setDismissed(true)}>
            {t('notify.close')}
          </Button>
        </Group>
      </MantineStack>
    </Alert>
  )
}
