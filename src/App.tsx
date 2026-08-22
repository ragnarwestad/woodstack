import { Container, Stack, Text, Title } from '@mantine/core'

export function App() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="xs">
        <Title order={1}>Woodstack</Title>
        <Text c="dimmed">Når er veden tørr nok til å fyre med?</Text>
      </Stack>
    </Container>
  )
}
