import { useId, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  NativeSelect,
  SimpleGrid,
  Stack as MantineStack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { SPECIES_IDS } from '../model/species'
import {
  deliveredKwh,
  formatNeed,
  formatUnitAmount,
  hasLoggedVolume,
  neededSolidLiters,
  STOVE_OPTIONS,
  totalLoggedSolidLiters,
} from '../model/needCalculator'
import { toSolidLiters } from '../model/volume'
import { VOLUME_UNITS, type Species, type Stack, type VolumeUnit } from '../storage/schema'
import {
  readResultUnitPreference,
  writeResultUnitPreference,
  type ResultUnit,
} from '../storage/resultUnitPreference'
import { useTranslation } from '../i18n/useTranslation'
import { BackLink } from './BackLink'

type Mode = 'energy' | 'volume'

type Result = {
  solidLiters: number
  /** Only set on the volume path — on the energy path the visitor typed the
   *  kWh figure themselves, so restating it back would say nothing new. */
  kwh?: number
}

type Props = {
  stacks: Stack[]
  onBack: () => void
}

/** "How much wood should I buy?" The inverse of the comparison screen: one
 *  number in (an energy need, or a volume already offered), the other
 *  numbers out. Nothing here writes to a stack — it only reads the ledgers
 *  for the "already have" line. */
export function NeedCalculator({ stacks, onBack }: Props) {
  const translator = useTranslation()
  const { t } = translator
  const speciesId = useId()
  const stoveId = useId()
  const unitId = useId()
  // Explicit id like this screen's other three selects, unlike `ComparePage`,
  // which leaves Mantine's implicit label wiring alone for all of its.
  const resultUnitId = useId()

  const [mode, setMode] = useState<Mode>('energy')
  const [species, setSpecies] = useState<Species>(SPECIES_IDS[0])
  const [stove, setStove] = useState<(typeof STOVE_OPTIONS)[number]['id']>(STOVE_OPTIONS[0].id)
  const [energyAmount, setEnergyAmount] = useState('')
  const [volumeAmount, setVolumeAmount] = useState('')
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('favn')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  // Held in state as well as in storage so a result already on screen is
  // restated the moment another unit is picked. The same setting the
  // comparison screen writes, so the two agree on the unit.
  const [resultUnit, setResultUnit] = useState<ResultUnit>(readResultUnitPreference)

  function chooseResultUnit(unit: ResultUnit) {
    writeResultUnitPreference(unit)
    setResultUnit(unit)
  }

  const efficiency = STOVE_OPTIONS.find((option) => option.id === stove)!.efficiency

  function submit() {
    if (mode === 'energy') {
      const kwh = Number(energyAmount)
      if (energyAmount.trim() === '' || !Number.isFinite(kwh) || kwh <= 0) {
        setError(t('need.amountRange'))
        setResult(null)
        return
      }
      setError(null)
      setResult({ solidLiters: neededSolidLiters(kwh, species, efficiency) })
    } else {
      const amount = Number(volumeAmount)
      if (volumeAmount.trim() === '' || !Number.isFinite(amount) || amount <= 0) {
        setError(t('need.amountRange'))
        setResult(null)
        return
      }
      setError(null)
      setResult({
        solidLiters: toSolidLiters(amount, volumeUnit),
        kwh: deliveredKwh(amount, volumeUnit, species, efficiency),
      })
    }
  }

  const alreadyHaveSolidLiters = totalLoggedSolidLiters(stacks)
  const showAlreadyHave = mode === 'energy' && result !== null && hasLoggedVolume(stacks)

  return (
    <MantineStack gap="md">
      <BackLink onClick={onBack} />
      <Title order={2}>{t('need.title')}</Title>

      <Tabs
        value={mode}
        onChange={(value) => {
          setMode(value as Mode)
          setResult(null)
          setError(null)
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="energy">{t('need.modeEnergyTab')}</Tabs.Tab>
          <Tabs.Tab value="volume">{t('need.modeVolumeTab')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="energy" pt="sm">
          <TextInput
            type="number"
            min={0}
            label={t('need.energyLabel')}
            value={energyAmount}
            onChange={(event) => setEnergyAmount(event.currentTarget.value)}
          />
        </Tabs.Panel>

        <Tabs.Panel value="volume" pt="sm">
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
            <TextInput
              type="number"
              min={0}
              label={t('need.amountLabel', { unit: t(`volume.unitShort.${volumeUnit}`) })}
              value={volumeAmount}
              onChange={(event) => setVolumeAmount(event.currentTarget.value)}
            />
            <NativeSelect
              id={unitId}
              label={t('need.unitLabel')}
              value={volumeUnit}
              onChange={(event) => setVolumeUnit(event.currentTarget.value as VolumeUnit)}
              data={VOLUME_UNITS.map((unit) => ({ value: unit, label: t(`volume.unit.${unit}`) }))}
            />
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>

      {/* Species and stove are common to both directions: species always
          shown (see acceptance criterion 7 in the spec — every result here
          includes a volume unit, so species is never skippable), stove
          because delivered heat depends on it whichever way the numbers run. */}
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        <NativeSelect
          id={speciesId}
          label={t('need.speciesLabel')}
          value={species}
          onChange={(event) => setSpecies(event.currentTarget.value as Species)}
          data={SPECIES_IDS.map((id) => ({ value: id, label: t(`species.${id}`) }))}
        />
        <NativeSelect
          id={stoveId}
          label={t('need.stoveLabel')}
          value={stove}
          onChange={(event) => setStove(event.currentTarget.value as (typeof STOVE_OPTIONS)[number]['id'])}
          data={STOVE_OPTIONS.map((option) => ({ value: option.id, label: t(`stove.${option.id}`) }))}
        />
      </SimpleGrid>

      {/* Above the answer it governs rather than in a menu: `solidLiters` is
          unit-independent, so a result already on screen changes unit here
          without «Beregn» being pressed again. */}
      <NativeSelect
        id={resultUnitId}
        label={t('compare.resultUnitLabel')}
        value={resultUnit}
        onChange={(event) => chooseResultUnit(event.currentTarget.value as ResultUnit)}
        data={VOLUME_UNITS.map((unit) => ({ value: unit, label: t(`volume.unit.${unit}`) }))}
      />

      {error && <Alert color="red">{error}</Alert>}

      <Group>
        <Button onClick={submit}>{t('need.submit')}</Button>
      </Group>

      {result && (
        <MantineStack gap={4}>
          <Text data-testid="need-result">{formatNeed(result.solidLiters, resultUnit, translator)}</Text>
          {result.kwh !== undefined && (
            <Text c="dimmed">{t('need.resultEnergy', { kwh: Math.round(result.kwh) })}</Text>
          )}
          {showAlreadyHave && (
            <Text data-testid="need-already-have" c="dimmed">
              {t('need.alreadyHave', {
                have: formatUnitAmount(alreadyHaveSolidLiters, resultUnit, translator),
                toBuy: formatUnitAmount(Math.max(0, result.solidLiters - alreadyHaveSolidLiters), resultUnit, translator),
              })}
            </Text>
          )}
        </MantineStack>
      )}
    </MantineStack>
  )
}
