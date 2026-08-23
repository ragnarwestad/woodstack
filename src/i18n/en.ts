import type { TranslationKey } from './nb'

/** Typed against `nb.ts`'s key union, so a key missing from either file is a
 *  compile error rather than a blank on screen. */
export const en: Record<TranslationKey, string> = {
  'app.tagline': 'When is the firewood dry enough to burn?',
  'app.language': 'Language',
  'app.theme': 'Colour theme',
  'app.themeLight': 'Light',
  'app.themeDark': 'Dark',
  'app.themeAuto': 'Auto',

  'common.readyBetween': 'Ready between {window}',
  'common.loadingClimate': 'Fetching climate data for the location …',
  'common.back': 'Back',
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.storageFull':
    'The browser has no room left, so nothing was saved. Try removing the photo, or delete a woodpile you no longer need.',

  'stackList.heading': 'My woodpiles',
  'stackList.add': 'New woodpile',
  'stackList.empty': 'No woodpiles yet. Add the first one, and we will work out when it is dry.',

  'stackDetail.notFound': 'Cannot find this woodpile.',
  'stackDetail.meta': '{species} · stacked {date} · {place}',
  'stackDetail.offline':
    'No network, so the climate data for {place} is still missing. We will try again the moment you are online.',
  'stackDetail.correctedEarlier': 'Adjusted for this year’s weather — a little ahead of normal',
  'stackDetail.correctedLater': 'Adjusted for this year’s weather — a little behind normal',
  'stackDetail.volumeCurrent': 'Left now: {volume}',
  'stackDetail.tabVolume': 'In/out',
  'stackDetail.tabReading': 'Reading',
  'stackDetail.tabHistory': 'History',
  'stackDetail.volumeNone': 'No wood logged yet.',
  'stackDetail.edit': 'Edit',
  'stackDetail.delete': 'Delete',
  'stackDetail.deleteQuestion': 'Delete “{name}”? Every entry and reading goes with it, and this cannot be undone.',

  'entryList.empty': 'Nothing logged yet.',
  'entryList.volumeDetail': '{kind}: {amount} {unit}',
  'entryList.delete': 'Remove',
  'entryList.deleteQuestion': 'Delete this entry? This cannot be undone.',

  'photo.label': 'Photo of the woodpile',
  'photo.description': 'Optional. Take it with the camera, or pick one you already have.',
  'photo.placeholder': 'Take or choose a photo',
  'photo.remove': 'Remove the photo',
  'photo.removeQuestion': 'Remove the photo from the woodpile? You can take a new one afterwards.',
  'photo.alt': 'Photo of the woodpile',
  'photo.failed': 'Could not read that photo. Try another one.',

  /* Both stack forms — the fields a new pile and an old one share. */
  'stackForm.name': 'Name of the woodpile',
  'stackForm.splitSize': 'How coarsely is it split?',
  'stackForm.cover': 'Is it under a roof?',
  'stackForm.exposure': 'Sun and wind where it stands',
  'stackForm.place': 'Nearest place',
  'stackForm.placeDescription': 'Used only for climate normals.',
  'stackForm.search': 'Search',
  'stackForm.noPlaces': 'Found no places by that name.',
  'stackForm.searchFailed': 'The place search did not answer. Try again when you are online.',
  'stackForm.pickPlace': 'Pick a location, so we know which climate the woodpile stands in.',
  'stackForm.save': 'Save',
  'stackForm.cancel': 'Cancel',
  'addStack.heading': 'New woodpile',
  'addStack.species': 'Species',
  'addStack.secondSpecies': 'Mixed with anything else?',
  'addStack.secondSpeciesNone': 'No, just the one',
  'addStack.secondSpeciesShare': 'How much of the other?',
  'addStack.stackedDate': 'Date stacked',
  'addStack.volumeAmount': 'Amount ({unit})',
  'addStack.volumeUnit': 'Unit',
  'addStack.needName': 'Give the woodpile a name, so you can find it again in the list.',

  'editStack.heading': 'Edit the woodpile',
  'editStack.locationFailed':
    'Could not fetch the climate data for the new location, so nothing was saved. Try again when you are online.',

  'logReading.moistureLabel': 'Moisture (% {basis})',
  'logReading.dateLabel': 'Date measured',
  'logReading.rangeError': 'The moisture has to be between {min} and {max}.',
  'logReading.save': 'Save',

  'volumeEntry.kindLabel': 'What did you do?',
  'volumeEntry.amountLabel': 'Amount ({unit})',
  'volumeEntry.unitLabel': 'Unit',
  'volumeEntry.dateLabel': 'Date',
  'volumeEntry.amountRange': 'The amount has to be a number between 0 and {max}.',
  'volumeEntry.save': 'Save',

  'install.heading': 'Add Woodstack to your home screen',
  'install.reason': 'It then opens from the home screen like any other app, and works offline.',
  'install.ios': 'Tap the Share button and choose “Add to Home Screen”.',
  'install.install': 'Install',
  'install.close': 'Close',

  'notify.heading': 'Get a nudge when the firewood is ready',
  'notify.reason':
    'We will tell you when the firewood is ready to burn, so you do not have to keep it in mind for months.',
  'notify.enable': 'Tell me',
  'notify.close': 'Close',

  'ready.body': '{name} might be ready to burn now. Worth checking with a meter.',

  'chart.emptyLabel': 'Drying curve without data',
  'chart.label': 'Drying curve: how dry the firewood gets over time, with the limit at {threshold}',

  'species.bjork': 'Birch',
  'species.or': 'Alder',
  'species.osp': 'Aspen',
  'species.furu': 'Pine',
  'species.gran': 'Spruce',
  'species.eik': 'Oak',
  'species.bok': 'Beech',

  'species.mixedLabel': '{primary} + {secondary} ({share})',
  'species.share.half': 'About half',
  'species.share.third': 'A third or so',
  'species.share.bit': 'Just a bit',

  'splitSize.small': 'Finely split',
  'splitSize.medium': 'Medium',
  'splitSize.large': 'Coarsely split',

  'cover.none': 'No, it stands in the open',
  'cover.roof': 'Yes, a roof over it and open sides',
  'cover.shed': 'Yes, in a woodshed',

  'exposure.sheltered': 'Little sun and wind',
  'exposure.normal': 'Normal',
  'exposure.exposed': 'Plenty of sun and wind',

  'volume.kind.addition': 'Added wood',
  'volume.kind.withdrawal': 'Took out wood',

  'volume.unit.fastKubikk': 'Solid cubic metre',
  'volume.unit.stablet': 'Stacked cubic metre',
  'volume.unit.losKubikk': 'Loose cubic metre',
  'volume.unit.favn': 'Favn (2.4 m³ stacked)',
  'volume.unit.storsekk': 'Bulk bag (1000 litres)',
  'volume.unit.sekk40': 'Sack (40 litres)',
  'volume.unit.sekk60': 'Sack (60 litres)',
  'volume.unitShort.fastKubikk': 'm³ solid',
  'volume.unitShort.stablet': 'm³ stacked',
  'volume.unitShort.losKubikk': 'm³ loose',
  'volume.unitShort.favn': 'favn',
  'volume.unitShort.storsekk': 'bulk bags',
  'volume.unitShort.sekk40': '40-litre sacks',
  'volume.unitShort.sekk60': '60-litre sacks',

  'units.moistureBasis': 'dry basis',
  'units.monthPart.beginning': 'beginning',
  'units.monthPart.middle': 'middle',
  'units.monthPart.end': 'end',
  'units.monthPart.of': 'of',
}
