import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import './index.css'
import { theme, cssVariablesResolver } from './theme'
import { LanguageProvider } from './i18n/LanguageProvider.tsx'
import { App } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="auto">
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </MantineProvider>
  </StrictMode>,
)
