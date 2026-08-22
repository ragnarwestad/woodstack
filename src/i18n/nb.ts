/** Norwegian is the source language: this file defines which keys exist, and
 *  `en.ts` is type-checked against it, so a key added here and forgotten there
 *  fails the build rather than the visitor. */
export const nb = {
  'app.tagline': 'Når er veden tørr nok til å fyre med?',
  'app.language': 'Språk',

  'common.readyBetween': 'Klar mellom {window}',
  'common.loadingClimate': 'Henter klimadata for stedet …',
  'common.back': 'Tilbake',

  'stackList.heading': 'Vedstablene mine',
  'stackList.add': 'Ny stabel',
  'stackList.empty': 'Ingen vedstabler ennå. Legg inn den første, så regner vi ut når den er tørr.',

  'stackDetail.notFound': 'Finner ikke denne stabelen.',
  'stackDetail.meta': '{species} · stablet {date} · {place}',
  'stackDetail.offline':
    'Ingen nett, så klimadataene for {place} mangler ennå. Vi prøver igjen med en gang du er på nett.',
  'stackDetail.volumeCurrent': 'Igjen nå: {volume}',
  'stackDetail.volumeNone': 'Ingen ved lagt inn ennå.',

  'addStack.heading': 'Ny vedstabel',
  'addStack.name': 'Navn på stabelen',
  'addStack.species': 'Treslag',
  'addStack.stackedDate': 'Stablet dato',
  'addStack.splitSize': 'Hvor grovt er den kløyvd?',
  'addStack.cover': 'Står den under tak?',
  'addStack.exposure': 'Sol og vind der den står',
  'addStack.volumeAmount': 'Hvor mye ved la du i stabelen?',
  'addStack.volumeAmountDescription': 'Valgfritt – du kan legge inn mengder senere også.',
  'addStack.volumeUnit': 'Enhet',
  'addStack.place': 'Sted',
  'addStack.placeDescription': 'Brukes bare til å hente klimanormaler – én gang, og så aldri mer.',
  'addStack.search': 'Søk',
  'addStack.chosenPlace': 'Valgt sted: {place}',
  'addStack.noPlaces': 'Fant ingen steder som heter det.',
  'addStack.searchFailed': 'Stedssøket svarte ikke. Prøv igjen når du har nett.',
  'addStack.pickPlace': 'Velg et sted, så vet vi hvilket klima stabelen står i.',
  'addStack.save': 'Lagre',
  'addStack.cancel': 'Avbryt',

  'logReading.heading': 'Har du målt stabelen?',
  'logReading.moistureLabel': 'Fuktighet',
  'logReading.moistureDescription': 'Prosent av {basis} – tallet måleren viser',
  'logReading.dateLabel': 'Målt dato',
  'logReading.rangeError': 'Fuktigheten må være mellom {min} og {max} %.',
  'logReading.save': 'Lagre måling',

  'volumeEntry.heading': 'Har du lagt inn eller tatt ut ved?',
  'volumeEntry.kindLabel': 'Hva gjorde du?',
  'volumeEntry.amountLabel': 'Mengde',
  'volumeEntry.unitLabel': 'Enhet',
  'volumeEntry.dateLabel': 'Dato',
  'volumeEntry.amountError': 'Mengden må være et tall større enn 0.',
  'volumeEntry.save': 'Lagre mengde',

  'exportImport.explanation':
    'Alt ligger bare i denne nettleseren. Safari sletter det etter 7 dager uten besøk – ta vare på lenken, så har du stablene igjen.',
  'exportImport.copy': 'Kopier lenken min',
  'exportImport.copied': 'Kopiert.',

  'install.heading': 'Legg Woodstack på hjem-skjermen',
  'install.eviction': 'Safari sletter alt appen har lagret etter 7 dager uten besøk. Installerte apper slipper unna.',
  'install.ios': 'Trykk Del-knappen i Safari og velg «Legg til på Hjem-skjerm».',
  'install.install': 'Installer',
  'install.close': 'Lukk',

  'chart.emptyLabel': 'Tørkekurve uten data',
  'chart.label': 'Tørkekurve: hvor tørr veden blir over tid, med grensen på {threshold}',

  'species.bjork': 'Bjørk',
  'species.or': 'Or',
  'species.osp': 'Osp',
  'species.furu': 'Furu',
  'species.gran': 'Gran',
  'species.eik': 'Eik',
  'species.bok': 'Bøk',

  'splitSize.small': 'Fint kløyvd',
  'splitSize.medium': 'Middels',
  'splitSize.large': 'Grovt kløyvd',

  'cover.none': 'Nei, den står åpent',
  'cover.roof': 'Ja, tak over og åpne sider',
  'cover.shed': 'Ja, i vedskjul',

  'exposure.sheltered': 'Lite sol og vind',
  'exposure.normal': 'Vanlig',
  'exposure.exposed': 'Mye sol og vind',

  'volume.kind.addition': 'La inn ved',
  'volume.kind.withdrawal': 'Tok ut ved',

  'volume.unit.fastKubikk': 'Fast kubikkmeter',
  'volume.unit.stablet': 'Stablet kubikkmeter',
  'volume.unit.losKubikk': 'Løs kubikkmeter',
  'volume.unit.favn': 'Favn (2,4 m³ stablet)',
  'volume.unit.storsekk': 'Storsekk (1000 liter)',
  'volume.unit.sekk40': 'Sekk (40 liter)',
  'volume.unit.sekk60': 'Sekk (60 liter)',
  'volume.unitShort.fastKubikk': 'm³ fast',

  'units.moistureBasis': 'tørrvekt',
  'units.monthPart.beginning': 'begynnelsen',
  'units.monthPart.middle': 'midten',
  'units.monthPart.end': 'slutten',
  'units.monthPart.of': 'av',
} as const

export type TranslationKey = keyof typeof nb
