import { useId, useState } from 'react'
import {
  Badge,
  Group,
  NativeSelect,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { SPECIES_IDS, VOLUME_UNITS, type Species } from '../storage/schema'
import {
  PRICE_UNITS,
  evaluateLot,
  isLotComplete,
  unitNeedsSpecies,
  type Lot,
  type LotResult,
  type PriceUnit,
} from '../model/lot'
import { MOISTURE_BANDS, moistureBand, type MoistureBandId } from '../model/moisture'
import { compareLots } from '../model/lotComparison'
import {
  readResultUnitPreference,
  writeResultUnitPreference,
  type ResultUnit,
} from '../storage/resultUnitPreference'
import { useTranslation, type Translator } from '../i18n/useTranslation'
import { DASHED_RULE, FIELD_LABEL_STYLE, PLUM_PANEL } from '../theme'
import { ExplainButton, ExplainedLabel } from './ExplainButton'

/** Two lots of firewood side by side: what each costs per kWh, what each
 *  weighs dry, and which of them is the better buy. The one screen in the app
 *  that belongs to no stack — it answers a question about wood someone else is
 *  selling, and stores nothing.
 *
 *  The arithmetic lives in `model/lot.ts` and the verdict in
 *  `model/lotComparison.ts`; this file asks for the six values a lot needs and
 *  puts the four answers on screen. That split is why the numbers can be
 *  tested against the spreadsheet without rendering anything.
 *
 *  The verdict line is the point of the screen, not decoration. A table of
 *  eight figures is what a spreadsheet gives because it can do no better; an
 *  app that leaves the visitor comparing two columns has handed the sum back
 *  to them. */

/** What one lot's form holds. Prices and amounts stay strings while they are
 *  being typed — a half-typed «24» is not the number 24 yet — and are made
 *  numbers only where the lot is priced. */
type LotDraft = {
  price: string
  amount: string
  unit: PriceUnit
  species: Species
  moistureId: MoistureBandId
}

/** Favn and birch because that is what firewood is advertised as here, and
 *  sale-ready because that is what a seller claims by default. The visitor
 *  changes what is not true of their advert rather than filling in five
 *  fields from empty. */
const EMPTY_LOT: LotDraft = { price: '', amount: '', unit: 'favn', species: 'bjork', moistureId: 'salgsved' }

function toLot(draft: LotDraft): Lot {
  return {
    price: Number(draft.price),
    amount: Number(draft.amount),
    unit: draft.unit,
    moisture: moistureBand(draft.moistureId).moisturePercent,
    // Left off entirely for a weight lot, so nothing downstream can quietly
    // use a species the visitor was never asked about.
    species: unitNeedsSpecies(draft.unit) ? draft.species : undefined,
  }
}

function formatNumber(value: number, decimals: number, { language }: Translator): string {
  const locale = language === 'nb' ? 'nb-NO' : 'en-US'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function unitLabel(unit: PriceUnit, { t }: Translator): string {
  return unit === 'kg' ? t('compare.unitKg') : t(`volume.unit.${unit}`)
}

/** One figure: what it is on the left, what it is worth on the right. The
 *  `data-testid` is the value's own name, so a test asks for the kilowatt-hour
 *  price rather than for the second row. */
function Figure({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700} data-testid={name} style={{ textAlign: 'right' }}>
        {value}
      </Text>
    </Group>
  )
}

type LotCardProps = {
  index: number
  draft: LotDraft
  onChange: (draft: LotDraft) => void
  /** Worked out by the page rather than here, because the verdict line needs
   *  both lots' results anyway and one of them must not be priced twice. */
  result: LotResult | null
  resultUnit: ResultUnit
  /** Whether the verdict points at this lot. `false` for both cards until
   *  there is a verdict, and for both on a tie — the badge cannot run ahead
   *  of the sentence it agrees with. */
  isCheapest: boolean
}

function LotCard({ index, draft, onChange, result, resultUnit, isCheapest }: LotCardProps) {
  const translator = useTranslation()
  const { t } = translator
  const moistureId = useId()

  const needsSpecies = unitNeedsSpecies(draft.unit)
  const amountInResultUnit = result?.amountIn(resultUnit) ?? null

  return (
    <Paper withBorder radius="lg" p="md" shadow="md" style={{ borderWidth: 2 }} data-testid={`lot-${index}`}>
      <Stack gap="sm">
        {/* The badge sits on the title's own row rather than floating over the
            card's corner: every other label-beside-a-heading in this app is a
            `Group justify="space-between"`, and an overlay would land on the
            card's 2 px border. */}
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Title order={3} ff="Outfit, sans-serif" fw={700} fz={13} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            {t('compare.lotHeading', { number: index + 1 })}
          </Title>
          {isCheapest && (
            <Badge color="yellow" radius="xl">
              {t('compare.cheapestBadge')}
            </Badge>
          )}
        </Group>

        <TextInput
          type="number"
          min={0}
          label={t('compare.priceLabel')}
          styles={{ label: FIELD_LABEL_STYLE }}
          value={draft.price}
          onChange={(event) => onChange({ ...draft, price: event.currentTarget.value })}
        />

        {/* Amount and unit on one row: neither means anything without the
            other, and «1» beside «favn» reads the way the advert does. */}
        <SimpleGrid cols={2} spacing="sm">
          <TextInput
            type="number"
            min={0}
            label={t('compare.amountLabel')}
            styles={{ label: FIELD_LABEL_STYLE }}
            value={draft.amount}
            onChange={(event) => onChange({ ...draft, amount: event.currentTarget.value })}
          />
          <NativeSelect
            label={t('compare.unitLabel')}
            styles={{ label: FIELD_LABEL_STYLE }}
            value={draft.unit}
            onChange={(event) => onChange({ ...draft, unit: event.currentTarget.value as PriceUnit })}
            data={PRICE_UNITS.map((value) => ({ value, label: unitLabel(value, translator) }))}
          />
        </SimpleGrid>

        {/* Disabled, never hidden, for the reason `AddStackForm` gives about
            its second-species picker: a field that comes and goes moves
            everything under it and makes the form a different shape each
            time. The description under it says why it is greyed out, so the
            visitor is not left wondering whether they missed something. */}
        <div>
          <NativeSelect
            label={t('compare.speciesLabel')}
            // Off, drawn rather than greyed: a palette with no grey in it has
            // to say "not for you" some other way, so the border goes dashed
            // and the fill a shade back from the cards around it.
            styles={{
              label: FIELD_LABEL_STYLE,
              input: needsSpecies
                ? undefined
                : {
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    backgroundColor:
                      'color-mix(in srgb, var(--mantine-color-default-border) 10%, var(--mantine-color-default))',
                  },
            }}
            description={needsSpecies ? undefined : t('compare.speciesNotNeeded')}
            disabled={!needsSpecies}
            value={draft.species}
            onChange={(event) => onChange({ ...draft, species: event.currentTarget.value as Species })}
            data={SPECIES_IDS.map((value) => ({ value, label: t(`species.${value}`) }))}
          />
        </div>

        <div>
          <ExplainedLabel
            htmlFor={moistureId}
            label={t('compare.moistureLabel')}
            labelStyle={FIELD_LABEL_STYLE}
            title={t('explain.compareMoisture.title')}
            body={t('explain.compareMoisture.body')}
          />
          <NativeSelect
            id={moistureId}
            value={draft.moistureId}
            onChange={(event) => onChange({ ...draft, moistureId: event.currentTarget.value as MoistureBandId })}
            data={MOISTURE_BANDS.map((band) => ({ value: band.id, label: t(`compare.moisture.${band.id}`) }))}
          />
        </div>

        {result === null ? (
          <Text size="sm" c="dimmed">
            {t('compare.awaitingLot')}
          </Text>
        ) : (
          <Stack gap={4} pt="xs">
            {/* Above the line, the six things you type; below it, the four the
                screen works out. The same rule the volume line is drawn with. */}
            <div aria-hidden="true" style={{ height: 2, background: DASHED_RULE }} />
            <Figure
              name="krPerKgDry"
              label={t('compare.krPerKgDry')}
              value={`${formatNumber(result.krPerKgDry, 2, translator)} kr`}
            />
            <Figure
              name="krPerKwh"
              label={t('compare.krPerKwh')}
              value={`${formatNumber(result.krPerKwh, 3, translator)} kr`}
            />
            <Figure
              name="kgAt20Percent"
              label={t('compare.kgAt20Percent')}
              value={`${formatNumber(result.kgAt20Percent, 0, translator)} kg`}
            />
            <Figure
              name="amountInUnit"
              label={t('compare.amountInUnit', { unit: t(`volume.unitShort.${resultUnit}`) })}
              // An en dash where the amount cannot be known: a lot sold by the
              // kilo has no species, and kilos without a species cannot be
              // read back as favner. See `amountIn` in `model/lot.ts`.
              value={amountInResultUnit === null ? '–' : formatNumber(amountInResultUnit, 2, translator)}
            />
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}

export function ComparePage() {
  const translator = useTranslation()
  const { t } = translator
  const [lots, setLots] = useState<[LotDraft, LotDraft]>([EMPTY_LOT, EMPTY_LOT])
  // Held in state as well as in storage so the figures move the moment a unit
  // is picked. The same setting the calculator screen writes, so a unit chosen
  // there is the one this screen opens with.
  const [resultUnit, setResultUnit] = useState<ResultUnit>(readResultUnitPreference)

  function chooseResultUnit(unit: ResultUnit) {
    writeResultUnitPreference(unit)
    setResultUnit(unit)
  }

  const results = lots.map(toLot).map((lot) => (isLotComplete(lot) ? evaluateLot(lot) : null))
  const [first, second] = results
  const verdict = first && second ? compareLots(first, second) : null

  function setLot(index: number, draft: LotDraft) {
    setLots((current) => (index === 0 ? [draft, current[1]] : [current[0], draft]))
  }

  return (
    <Stack gap="md">
      <Title order={2}>{t('compare.title')}</Title>
      <Text c="dimmed" size="sm">
        {t('compare.intro')}
      </Text>

      {/* The «?» on its own, next to the figure it explains rather than next
          to a field: kroner per kWh is the answer the screen is built around,
          and it is worth a sentence about why it and not kroner per kilo.
          Beside the unit picker rather than above it — the two used to stack
          into three lines of height for two short controls, wasting the
          scroll a phone has least of. */}
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        {/* Above the lots rather than in a menu: the unit the figures are read
            in belongs next to the figures it governs, so picking it and seeing
            what it did are the same glance. */}
        <NativeSelect
          label={t('compare.resultUnitLabel')}
          value={resultUnit}
          onChange={(event) => chooseResultUnit(event.currentTarget.value as ResultUnit)}
          data={VOLUME_UNITS.map((unit) => ({ value: unit, label: t(`volume.unit.${unit}`) }))}
        />

        <Group gap={6} wrap="nowrap">
          <Text size="sm" fw={700}>
            {t('compare.krPerKwh')}
          </Text>
          <ExplainButton title={t('explain.comparePerKwh.title')} body={t('explain.comparePerKwh.body')} size={22} />
        </Group>
      </Group>

      {/* One column on a phone: two lots of five fields side by side on a
          narrow screen would squeeze both into unreadable columns. */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {lots.map((draft, index) => (
          <LotCard
            key={index}
            index={index}
            draft={draft}
            onChange={(next) => setLot(index, next)}
            result={results[index]}
            resultUnit={resultUnit}
            isCheapest={verdict?.cheaperIndex === index}
          />
        ))}
      </SimpleGrid>

      {verdict && (
        <Paper radius="lg" p="lg" style={{ backgroundColor: PLUM_PANEL, color: 'var(--mantine-color-white)' }}>
          {/* Not Bungee: it draws capitals only, and this line is a sentence
              with lower case in it, the same reason the stack page's name
              gives its `Title` the same override. */}
          <Text ff="Outfit, sans-serif" fw={700} fz={17} lh={1.3} data-testid="verdict">
            {verdict.cheaperIndex === null
              ? t('compare.verdictTie')
              : t('compare.verdict', {
                  number: verdict.cheaperIndex + 1,
                  percent: formatNumber(verdict.percentCheaper, 0, translator),
                })}
          </Text>
        </Paper>
      )}
    </Stack>
  )
}
