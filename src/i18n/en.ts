import type { TranslationKey } from './nb'

/** Typed against `nb.ts`'s key union, so a key missing from either file is a
 *  compile error rather than a blank on screen. */
export const en: Record<TranslationKey, string> = {
  'app.slogan': 'Peace, love and dry firewood',
  'app.tagline': 'When is the firewood dry enough to burn?',
  'app.home': 'Home',
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

  'explain.readyWindow.title': 'Why a window, and not one date?',
  'explain.readyWindow.body':
    'Nobody can know the weather that far ahead day by day. So the stack is estimated to be ready sometime within this window, rather than on one date that would miss anyway.',
  'explain.moisture.title': 'Why “dry basis”?',
  'explain.moisture.body':
    'The percentage is measured against what the wood would weigh bone dry. Many moisture meters show wet-basis percent instead, which gives a lower number for exactly the same wood – fresh birch is 45 % wet basis and 75 % dry basis.',
  'explain.volumeUnits.title': 'Favn, stacked or solid cubic metres?',
  'explain.volumeUnits.body':
    'The three do not measure the same thing. A stacked cubic metre counts the air between the logs, a solid cubic metre is the wood alone, and a favn is 2.4 m³ stacked – that is 1.6 m³ solid. The same pile of firewood gives three different numbers depending on the unit you pick.',

  'nav.tabStacks': 'Woodpiles',
  'nav.tabCompare': 'Compare',
  'nav.tabNeed': 'Need',

  'about.menuLabel': 'More',
  'about.menuItem': 'About Woodstack',
  'about.title': 'About Woodstack',
  'about.tabWhat': 'About',
  'about.tabHow': 'How we calculate',
  'about.tabInfo': 'Info',
  'about.what.body':
    'Woodstack estimates when your woodpile is dry enough to burn. You enter the species, when it was stacked and a few other details, and the app works out a window – say the middle of September to the middle of October – rather than one exact date.\n\nIt is an estimate, not a measurement. Nobody can say what the weather will be day by day that far ahead, so the wood may be ready a little before or a little after the window.',
  'about.how.body':
    'Firewood dries towards an equilibrium set by the temperature and the humidity where the pile stands – rather like washing on a line, which eventually stops drying any further. How fast that goes depends on the species, how coarsely the wood is split, and whether it stands under a roof, in the sun or sheltered.\n\nWe use climate normals – the average weather across several years – instead of the forecast. Firewood dries over many months, so this year’s weather evens out towards the normal anyway. In return the app works without a network, and you do not have to keep checking in.\n\nBecause nobody can say exactly which day the pile is ready, we show a window rather than one date.\n\nMoisture is always given as a share of dry weight – what the wood would weigh bone dry – never of wet weight. The two give very different numbers for exactly the same wood.',
  'about.info.body':
    'Everything you enter in Woodstack stays in this browser and is never sent to any server: the app has no account and no backend to send it to. The only service outside the app it talks to is Open-Meteo, used to search for places and fetch climate data for them.',
  'about.version': 'Version {value}',

  /* Comparing two lots of firewood: one purchase against another, nothing to
     do with a woodpile the visitor already owns. */
  'compare.title': 'Compare two lots of firewood',
  'compare.resultUnitLabel': 'Unit in the answer',
  'compare.lotHeading': 'Lot {number}',
  'compare.priceLabel': 'Price for the whole lot (kr)',
  'compare.amountLabel': 'Amount',
  'compare.unitLabel': 'Unit',
  'compare.unitKg': 'Kilos',
  'compare.speciesLabel': 'Species',
  'compare.speciesNotNeeded': 'Not needed when the lot is sold by weight',
  'compare.moistureLabel': 'How dry is the wood?',
  'compare.moisture.nyfelt': 'Freshly felled – cut this year',
  'compare.moisture.syretorket': 'Leaf-dried – felled in leaf and left lying',
  'compare.moisture.ra': 'Raw – stacked, but not dry yet',
  'compare.moisture.salgsved': 'Sale-ready – ready to burn',
  'compare.moisture.ekstraTorr': 'Extra dry – kept indoors for a long time',
  'compare.krPerKgDry': 'Kr per kg of sale-ready wood',
  'compare.krPerKwh': 'Kr per kWh',
  'compare.kgAt20Percent': 'Kg of sale-ready wood (20 % moisture)',
  'compare.amountInUnit': 'Amount in {unit}',
  'compare.awaitingLot': 'Enter a price and an amount, and the figures appear here.',
  'compare.verdict': 'Lot {number} is {percent} % cheaper per kWh.',
  'compare.verdictTie': 'The two lots cost the same per kWh.',
  'compare.verdictAwaiting': 'Enter the price, the amount and how dry the wood is for both lots.',
  'compare.cheapestBadge': 'Cheapest',
  'explain.compareMoisture.title': 'Why do we ask how dry the wood is?',
  'explain.compareMoisture.body':
    'Water weighs, and water does not burn. Buying wood by weight means paying for the water too, and then spending heat boiling it off. That is why fresh wood sold by weight is a worse buy than the price per kilo suggests.\n\nWhen the wood is sold by volume – favn, cubic metre, sack – the moisture makes no difference to the sum: a favn is the same amount of wood whether it rained on it or not.',
  'explain.comparePerKwh.title': 'Why kroner per kWh?',
  'explain.comparePerKwh.body':
    'The two lots usually come in different units, of different species and at different moisture. The kilowatt-hour is the one figure all of that converts into: how much heat the money actually buys.\n\nWe leave the stove efficiency out. It would make both lots equally worse, and so would not change which of them is cheaper.',

  /* "How much do I need?" — the calculator for an energy need or an offered
     lot, not a comparison of two. */
  'need.title': 'How much wood do I need?',
  'need.modeEnergyTab': 'I know how much heat I need',
  'need.modeVolumeTab': 'I know how much wood I am offered',
  'need.speciesLabel': 'Species',
  'need.stoveLabel': 'Stove',
  'need.energyLabel': 'Energy need (kWh)',
  'need.amountLabel': 'Amount ({unit})',
  'need.unitLabel': 'Unit',
  'need.submit': 'Calculate',
  'need.result': 'About {primary}, or {secondary}',
  'need.resultEnergy': 'That is about {kwh} kWh of delivered heat',
  'need.alreadyHave': 'You already have about {have}, so you need to buy {toBuy} more.',
  'need.energyAmountRange': 'The energy need must be a number greater than 0.',
  'need.amountRange': 'The amount must be a number greater than 0.',

  'stove.rentbrennende': 'Clean-burning stove',
  'stove.gammel': 'Old stove',
  'stove.grue': 'Open fireplace',

  'stackList.heading': 'My woodpiles',
  'stackList.add': 'New woodpile',
  'stackList.empty': 'No woodpiles yet. Add the first one, and we will work out when it is dry.',
  'stackList.example': 'Example',

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
  'stackDetail.tabPhoto': 'Photo',
  'stackDetail.volumeNone': 'No wood logged yet.',
  'stackDetail.edit': 'Edit',
  'stackList.delete': 'Delete',
  'stackList.deleteQuestion': 'Delete “{name}”? Every entry and reading goes with it, and this cannot be undone.',

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
  // No longer offered for a new entry, but kept because older entries are
  // still stored in it — see VolumeUnit in storage/schema.ts.
  'volume.unit.stablet': 'Stacked cubic metre',
  'volume.unit.stablet60': 'Stacked cubic metre (60 cm)',
  'volume.unit.stablet30': 'Stacked cubic metre (30 cm)',
  'volume.unit.losKubikk': 'Loose cubic metre',
  'volume.unit.favn': 'Favn (2.4 m³ stacked)',
  'volume.unit.storfavn': 'Storfavn',
  'volume.unit.cord': 'Cord',
  'volume.unit.storsekk': 'Bulk bag (1000 litres)',
  'volume.unit.sekk40': 'Sack (40 litres)',
  'volume.unit.sekk60': 'Sack (60 litres)',
  'volume.unit.sekk80': 'Sack (80 litres)',
  'volume.unitShort.fastKubikk': 'm³ solid',
  'volume.unitShort.stablet': 'm³ stacked',
  'volume.unitShort.stablet60': 'm³ stacked 60 cm',
  'volume.unitShort.stablet30': 'm³ stacked 30 cm',
  'volume.unitShort.losKubikk': 'm³ loose',
  'volume.unitShort.favn': 'favn',
  'volume.unitShort.storfavn': 'storfavn',
  'volume.unitShort.cord': 'cords',
  'volume.unitShort.storsekk': 'bulk bags',
  'volume.unitShort.sekk40': '40-litre sacks',
  'volume.unitShort.sekk60': '60-litre sacks',
  'volume.unitShort.sekk80': '80-litre sacks',

  'units.moistureBasis': 'dry basis',
  'units.monthPart.beginning': 'beginning',
  'units.monthPart.middle': 'middle',
  'units.monthPart.end': 'end',
  'units.monthPart.of': 'of',
}
