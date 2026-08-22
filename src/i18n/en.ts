import type { TranslationKey } from './nb'

/** Typed against `nb.ts`'s key union, so a key missing from either file is a
 *  compile error rather than a blank on screen. */
export const en: Record<TranslationKey, string> = {
  'app.tagline': 'When is the firewood dry enough to burn?',
  'app.language': 'Language',

  'common.readyBetween': 'Ready between {window}',
  'common.loadingClimate': 'Fetching climate data for the location …',
  'common.back': 'Back',

  'stackList.heading': 'My woodpiles',
  'stackList.add': 'New woodpile',
  'stackList.empty': 'No woodpiles yet. Add the first one, and we will work out when it is dry.',

  'stackDetail.notFound': 'Cannot find this woodpile.',
  'stackDetail.meta': '{species} · stacked {date} · {place}',
  'stackDetail.offline':
    'No network, so the climate data for {place} is still missing. We will try again the moment you are online.',

  'addStack.heading': 'New woodpile',
  'addStack.name': 'Name of the woodpile',
  'addStack.species': 'Species',
  'addStack.stackedDate': 'Date stacked',
  'addStack.splitSize': 'How coarsely is it split?',
  'addStack.cover': 'Is it under a roof?',
  'addStack.exposure': 'Sun and wind where it stands',
  'addStack.place': 'Location',
  'addStack.placeDescription': 'Used only to fetch climate normals – once, and then never again.',
  'addStack.search': 'Search',
  'addStack.chosenPlace': 'Chosen location: {place}',
  'addStack.noPlaces': 'Found no places by that name.',
  'addStack.searchFailed': 'The place search did not answer. Try again when you are online.',
  'addStack.pickPlace': 'Pick a location, so we know which climate the woodpile stands in.',
  'addStack.save': 'Save',
  'addStack.cancel': 'Cancel',

  'logReading.heading': 'Have you measured the woodpile?',
  'logReading.moistureLabel': 'Moisture',
  'logReading.moistureDescription': 'Percent of {basis} – the number the meter shows',
  'logReading.dateLabel': 'Date measured',
  'logReading.rangeError': 'The moisture has to be between {min} and {max} %.',
  'logReading.save': 'Save reading',

  'exportImport.explanation':
    'Everything is kept in this browser only. Safari deletes it after 7 days without a visit – keep the link, and you have the woodpiles back.',
  'exportImport.copy': 'Copy my link',
  'exportImport.copied': 'Copied.',

  'install.heading': 'Add Woodstack to your home screen',
  'install.eviction':
    'Safari deletes everything the app has stored after 7 days without a visit. Installed apps are spared.',
  'install.ios': 'Tap the Share button in Safari and choose “Add to Home Screen”.',
  'install.install': 'Install',
  'install.close': 'Close',

  'chart.emptyLabel': 'Drying curve without data',
  'chart.label': 'Drying curve: how dry the firewood gets over time, with the limit at {threshold}',

  'species.bjork': 'Birch',
  'species.or': 'Alder',
  'species.osp': 'Aspen',
  'species.furu': 'Pine',
  'species.gran': 'Spruce',
  'species.eik': 'Oak',
  'species.bok': 'Beech',

  'splitSize.small': 'Finely split',
  'splitSize.medium': 'Medium',
  'splitSize.large': 'Coarsely split',

  'cover.none': 'No, it stands in the open',
  'cover.roof': 'Yes, a roof over it and open sides',
  'cover.shed': 'Yes, in a woodshed',

  'exposure.sheltered': 'Little sun and wind',
  'exposure.normal': 'Normal',
  'exposure.exposed': 'Plenty of sun and wind',

  'units.moistureBasis': 'dry basis',
  'units.monthPart.beginning': 'beginning',
  'units.monthPart.middle': 'middle',
  'units.monthPart.end': 'end',
  'units.monthPart.of': 'of',
}
