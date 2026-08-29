import { useId, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  NativeSelect,
  Paper,
  Radio,
  SimpleGrid,
  Stack as MantineStack,
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
import { FIELD_LABEL_STYLE, PLUM_PANEL } from '../theme'

type Mode = 'energy' | 'volume'

type Result = {
  solidLiters: number
  /** Only set on the volume path — on the energy path the visitor typed the
   *  kWh figure themselves, so restating it back would say nothing new. */
  kwh?: number
}

type Props = {
  stacks: Stack[]
}

/** "How much wood should I buy?" The inverse of the comparison screen: one
 *  number in (an energy need, or a volume already offered), the other
 *  numbers out. Nothing here writes to a stack — it only reads the ledgers
 *  for the "already have" line. */
export function NeedCalculator({ stacks }: Props) {
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
        setError(t('need.energyAmountRange'))
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
      {/* Sticky under the header rather than moving into it — the same
          `Group` `StackList`'s heading row stands in, and the same styling,
          so the two read as one row of chrome rather than two different
          shapes. Reads the same `--ws-header-height` `AppHeader` publishes.
          The 8px is padding, inside the sticky box, not a margin in front of
          it: a margin sits outside the box in normal flow, so the row would
          have to scroll that distance shut before locking, moving again
          despite `marginTop` cancelling the page container's own `pt="lg"`
          in full. Equal top and bottom is what centres the title in the box
          rather than crowding it toward one edge. */}
      <Group
        justify="space-between"
        align="center"
        style={{
          position: 'sticky',
          top: 'var(--ws-header-height, 0px)',
          zIndex: 1,
          backgroundColor: 'var(--mantine-color-body)',
          paddingBlock: 8,
          // Pinned to the same height as the list's own heading row, which
          // has a button in it this row does not — left alone, this row
          // would come out shorter than that one. A literal number, not
          // `var(--button-height-sm)`: Mantine defines that custom property
          // scoped to the button's own root class, invisible outside the
          // button's own subtree — custom properties only cascade downward,
          // so a reference to it here silently failed to resolve and the
          // whole declaration was dropped, at any padding value.
          minHeight: 52,
          marginTop: 'calc(var(--mantine-spacing-lg) * -1)',
        }}
      >
        <Title order={2}>{t('need.title')}</Title>
      </Group>

      {/* A choice, not a switch between two screens: picking one clears
          nothing the visitor cannot see, so a radio pair says that better
          than two tabs did — a tab reads as "go here", and there is nowhere
          to go, only a different field below to fill in. */}
      <Radio.Group
        value={mode}
        onChange={(value) => {
          setMode(value as Mode)
          setResult(null)
          setError(null)
        }}
      >
        <MantineStack gap={8}>
          <Radio value="energy" label={t('need.modeEnergyTab')} />
          <Radio value="volume" label={t('need.modeVolumeTab')} />
        </MantineStack>
      </Radio.Group>

      {mode === 'energy' ? (
        // The same two-column grid as the volume mode's pair of fields, so a
        // single field does not stretch across a width two fields share —
        // the empty second cell costs nothing on a phone, where `cols` folds
        // back to one anyway.
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <TextInput
            type="number"
            min={0}
            label={t('need.energyLabel')}
            styles={{ label: FIELD_LABEL_STYLE }}
            value={energyAmount}
            onChange={(event) => setEnergyAmount(event.currentTarget.value)}
          />
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <TextInput
            type="number"
            min={0}
            label={t('need.amountLabel', { unit: t(`volume.unitShort.${volumeUnit}`) })}
            styles={{ label: FIELD_LABEL_STYLE }}
            value={volumeAmount}
            onChange={(event) => setVolumeAmount(event.currentTarget.value)}
          />
          <NativeSelect
            id={unitId}
            label={t('need.unitLabel')}
            styles={{ label: FIELD_LABEL_STYLE }}
            value={volumeUnit}
            onChange={(event) => setVolumeUnit(event.currentTarget.value as VolumeUnit)}
            data={VOLUME_UNITS.map((unit) => ({ value: unit, label: t(`volume.unit.${unit}`) }))}
          />
        </SimpleGrid>
      )}

      {/* Species and stove are common to both directions: species always
          shown (see acceptance criterion 7 in the spec — every result here
          includes a volume unit, so species is never skippable), stove
          because delivered heat depends on it whichever way the numbers run. */}
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        <NativeSelect
          id={speciesId}
          label={t('need.speciesLabel')}
          styles={{ label: FIELD_LABEL_STYLE }}
          value={species}
          onChange={(event) => setSpecies(event.currentTarget.value as Species)}
          data={SPECIES_IDS.map((id) => ({ value: id, label: t(`species.${id}`) }))}
        />
        <NativeSelect
          id={stoveId}
          label={t('need.stoveLabel')}
          styles={{ label: FIELD_LABEL_STYLE }}
          value={stove}
          onChange={(event) => setStove(event.currentTarget.value as (typeof STOVE_OPTIONS)[number]['id'])}
          data={STOVE_OPTIONS.map((option) => ({ value: option.id, label: t(`stove.${option.id}`) }))}
        />
      </SimpleGrid>

      {/* Above the answer it governs rather than in a menu: `solidLiters` is
          unit-independent, so a result already on screen changes unit here
          without «Beregn» being pressed again. The same half-width grid as
          the fields above it, rather than a lone field spanning both. */}
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        <NativeSelect
          id={resultUnitId}
          label={t('compare.resultUnitLabel')}
          value={resultUnit}
          onChange={(event) => chooseResultUnit(event.currentTarget.value as ResultUnit)}
          data={VOLUME_UNITS.map((unit) => ({ value: unit, label: t(`volume.unit.${unit}`) }))}
        />
      </SimpleGrid>

      <Group>
        <Button
          onClick={submit}
          radius={999}
          className="ws-pressable"
          fw={700}
          fz={13}
          tt="uppercase"
          style={{ letterSpacing: '0.08em' }}
        >
          {t('need.submit')}
        </Button>
      </Group>

      {/* Below the button either way, error or answer — an error above it
          used to shove «Beregn» down the moment a bad number was typed, so
          the button sat somewhere different depending on what happened
          last. */}
      {error && <Alert color="red">{error}</Alert>}

      {/* The answer the screen exists to give, so it takes the plum panel the
          stack page's drying window takes — not a card, which is for something
          you act on. The two lines under it are context, dimmed by opacity
          rather than by `c="dimmed"`: dimmed is a cream-page colour and would
          go dark against plum. */}
      {result && (
        <Paper radius="lg" p="lg" style={{ backgroundColor: PLUM_PANEL, color: 'var(--mantine-color-white)' }}>
          <MantineStack gap={4}>
            {/* Not Bungee: it draws capitals only, and this line is a
                sentence with lower case in it, the same reason the stack
                page's name gives its `Title` the same override. */}
            <Text ff="Outfit, sans-serif" fw={700} fz={17} lh={1.3} data-testid="need-result">
              {formatNeed(result.solidLiters, resultUnit, translator)}
            </Text>
            {result.kwh !== undefined && (
              <Text fz={13} style={{ opacity: 0.72 }}>
                {t('need.resultEnergy', { kwh: Math.round(result.kwh) })}
              </Text>
            )}
            {showAlreadyHave && (
              <Text fz={13} style={{ opacity: 0.72 }} data-testid="need-already-have">
                {t('need.alreadyHave', {
                  have: formatUnitAmount(alreadyHaveSolidLiters, resultUnit, translator),
                  toBuy: formatUnitAmount(Math.max(0, result.solidLiters - alreadyHaveSolidLiters), resultUnit, translator),
                })}
              </Text>
            )}
          </MantineStack>
        </Paper>
      )}
    </MantineStack>
  )
}
