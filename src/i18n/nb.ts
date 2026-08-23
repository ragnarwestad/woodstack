/** Norwegian is the source language: this file defines which keys exist, and
 *  `en.ts` is type-checked against it, so a key added here and forgotten there
 *  fails the build rather than the visitor. */
export const nb = {
  'app.slogan': 'Fred, kjærlighet og tørr ved',
  'app.tagline': 'Når er veden tørr nok til å fyre med?',
  'app.language': 'Språk',
  'app.theme': 'Fargetema',
  'app.themeLight': 'Lys',
  'app.themeDark': 'Mørk',
  'app.themeAuto': 'Auto',

  'common.readyBetween': 'Klar mellom {window}',
  'common.loadingClimate': 'Henter klimadata for stedet …',
  'common.back': 'Tilbake',
  'common.ok': 'Ok',
  'common.cancel': 'Avbryt',
  'common.storageFull':
    'Nettleseren har ikke plass til mer, så ingenting ble lagret. Prøv å fjerne bildet, eller slett en stabel du ikke trenger.',

  /* The «?» marks. Sparingly: an explanation behind every field is the same
     wall of text with an extra click in front of it. */
  'explain.readyWindow.title': 'Hvorfor et vindu, og ikke én dato?',
  'explain.readyWindow.body':
    'Været så langt fram kan ingen vite dag for dag. Derfor anslås stabelen å bli klar en gang i dette vinduet, i stedet for på én dato som uansett ville bomma.',
  'explain.moisture.title': 'Hvorfor «tørrvekt»?',
  'explain.moisture.body':
    'Prosenten regnes av vekta veden ville hatt helt tørr. Mange fuktmålere viser prosent av våtvekt i stedet, og det gir et lavere tall for nøyaktig samme ved – fersk bjørk er 45 % våtvekt og 75 % tørrvekt.',
  'explain.volumeUnits.title': 'Favn, stablet eller fast kubikkmeter?',
  'explain.volumeUnits.body':
    'De tre måler ikke det samme. Stablet kubikkmeter teller med luften mellom kubbene, fast kubikkmeter er bare selve veden, og en favn er 2,4 m³ stablet – altså 1,6 m³ fast. Samme vedhaug gir tre ulike tall, alt etter hvilken enhet du velger.',

  /* The dialog behind the header's three dots. The same explaining voice as
     the «?» marks above, at the scale of the whole app rather than one field. */
  'about.menuLabel': 'Mer',
  'about.menuItem': 'Om Woodstack',
  'about.title': 'Om Woodstack',
  'about.tabWhat': 'Om',
  'about.tabHow': 'Slik regner vi',
  'about.tabInfo': 'Info',
  'about.what.body':
    'Woodstack anslår når vedstabelen din er tørr nok til å fyre med. Du legger inn treslag, når veden ble stablet og noen få andre opplysninger, og appen regner ut et vindu – for eksempel midten av september til midten av oktober – ikke én bestemt dato.\n\nDet er et anslag, ikke en måling. Ingen kan si hvordan været blir dag for dag så langt fram, så veden kan bli klar litt før eller litt etter vinduet.',
  'about.how.body':
    'Ved tørker mot en likevekt som bestemmes av temperaturen og luftfuktigheten der stabelen står – litt som klesvask på snora, som til slutt slutter å tørke mer. Hvor fort det går, avhenger av treslaget, hvor grovt veden er kløyvd, og om den står under tak, i sola eller i le.\n\nVi regner med klimanormaler – gjennomsnittsværet gjennom flere år – i stedet for værmeldingen. Ved tørker over mange måneder, så årets vær jevner seg uansett ut mot normalen. Til gjengjeld virker appen uten nett, og du slipper å følge med.\n\nFordi ingen kan si nøyaktig hvilken dag stabelen er klar, viser vi et vindu i stedet for én dato.\n\nFuktighet oppgis alltid som andel av tørrvekt – hva veden ville veid helt tørr – aldri av våtvekt. De to gir svært ulike tall for nøyaktig samme ved.',
  'about.info.body':
    'Alt du legger inn i Woodstack blir liggende i denne nettleseren, og sendes aldri til noen server: appen har verken konto eller noen bakside å sende det til. Den eneste tjenesten utenfor appen den snakker med, er Open-Meteo, som brukes til å søke opp steder og hente klimadata for dem.',
  'about.version': 'Versjon {value}',

  /* Comparing two lots of firewood: one purchase against another, nothing to
     do with a woodpile the visitor already owns. */
  'compare.menuItem': 'Sammenlign to vedpartier',
  'compare.title': 'Sammenlign to vedpartier',
  'compare.resultUnitLabel': 'Enhet i svaret',
  'compare.intro':
    'Legg inn pris, mengde og hvor tørr veden er for begge partiene. Appen regner om til kroner per kWh, som er tallet som avgjør hvilket parti som er billigst.',
  'compare.lotHeading': 'Parti {number}',
  'compare.priceLabel': 'Pris for hele partiet (kr)',
  'compare.amountLabel': 'Mengde',
  'compare.unitLabel': 'Enhet',
  'compare.unitKg': 'Kilo',
  'compare.speciesLabel': 'Treslag',
  'compare.speciesNotNeeded': 'Trengs ikke når partiet selges etter vekt',
  'compare.moistureLabel': 'Hvor tørr er veden?',
  'compare.moisture.nyfelt': 'Nyfelt – felt nå i år',
  'compare.moisture.syretorket': 'Syretørket – felt med lauv på og latt ligge',
  'compare.moisture.ra': 'Rå ved – stablet, men ikke tørr ennå',
  'compare.moisture.salgsved': 'Salgsved – klar til å fyre med',
  'compare.moisture.ekstraTorr': 'Ekstra tørr – innendørs over lang tid',
  'compare.krPerKgDry': 'Kr per kg salgsklar ved',
  'compare.krPerKwh': 'Kr per kWh',
  'compare.kgAt20Percent': 'Kg salgsklar ved (20 % fukt)',
  'compare.amountInUnit': 'Mengde i {unit}',
  'compare.awaitingLot': 'Fyll inn pris og mengde, så kommer tallene her.',
  'compare.verdict': 'Parti {number} er {percent} % billigere per kWh.',
  'compare.verdictTie': 'De to partiene koster like mye per kWh.',
  'explain.compareMoisture.title': 'Hvorfor spør vi hvor tørr veden er?',
  'explain.compareMoisture.body':
    'Vann veier, og vann brenner ikke. Kjøper du ved etter vekt, betaler du for vannet også, og du må i tillegg bruke varme på å koke det bort. Derfor er fersk ved etter vekt et dårligere kjøp enn kiloprisen viser.\n\nSelges veden etter volum – favn, kubikkmeter, sekk – spiller fuktigheten ingen rolle for regnestykket: en favn er like mye ved uansett om det har regnet på den.',
  'explain.comparePerKwh.title': 'Hvorfor kroner per kWh?',
  'explain.comparePerKwh.body':
    'De to partiene har som regel ulik enhet, ulikt treslag og ulik fuktighet. Kilowattimen er det ene tallet alt dette kan regnes om til: hvor mye varme du faktisk får igjen for pengene.\n\nVi regner uten virkningsgraden til ovnen. Den ville gjort begge partiene like mye dårligere, og dermed ikke endret hvilket av dem som er billigst.',

  'stackList.heading': 'Vedstablene mine',
  'stackList.add': 'Ny stabel',
  'stackList.empty': 'Ingen vedstabler ennå. Legg inn den første, så regner vi ut når den er tørr.',
  /** On a stack the app put there itself, so the list cannot pass three
   *  woodpiles nobody entered off as the visitor's own. */
  'stackList.example': 'Eksempel',

  'stackDetail.notFound': 'Finner ikke denne stabelen.',
  'stackDetail.meta': '{species} · stablet {date} · {place}',
  'stackDetail.offline':
    'Ingen nett, så klimadataene for {place} mangler ennå. Vi prøver igjen med en gang du er på nett.',
  'stackDetail.correctedEarlier': 'Justert etter årets vær — stabelen ligger litt foran normalt',
  'stackDetail.correctedLater': 'Justert etter årets vær — stabelen ligger litt bak normalt',
  'stackDetail.volumeCurrent': 'Igjen nå: {volume}',
  'stackDetail.tabVolume': 'Inn/ut',
  'stackDetail.tabReading': 'Måling',
  'stackDetail.tabHistory': 'Historikk',
  'stackDetail.tabPhoto': 'Bilde',
  'stackDetail.volumeNone': 'Ingen ved lagt inn ennå.',
  'stackDetail.edit': 'Endre',
  'stackList.delete': 'Slett',
  'stackList.deleteQuestion': 'Slette «{name}»? Alle føringer og målinger forsvinner med den, og det kan ikke angres.',

  'entryList.empty': 'Ingenting lagt inn ennå.',
  'entryList.volumeDetail': '{kind}: {amount} {unit}',
  'entryList.delete': 'Fjern',
  'entryList.deleteQuestion': 'Slette denne føringen? Det kan ikke angres.',

  'photo.label': 'Bilde av stabelen',
  'photo.description': 'Valgfritt. Ta bildet med kameraet, eller velg et du har fra før.',
  'photo.placeholder': 'Ta eller velg et bilde',
  'photo.remove': 'Fjern bildet',
  'photo.removeQuestion': 'Fjerne bildet fra stabelen? Du kan ta et nytt etterpå.',
  'photo.alt': 'Bilde av vedstabelen',
  'photo.failed': 'Fikk ikke lest bildet. Prøv et annet.',

  /* Both stack forms — the fields a new pile and an old one share. */
  'stackForm.name': 'Navn på stabelen',
  'stackForm.splitSize': 'Hvor grovt er den kløyvd?',
  'stackForm.cover': 'Står den under tak?',
  'stackForm.exposure': 'Sol og vind der den står',
  'stackForm.place': 'Nærmeste sted',
  'stackForm.placeDescription': 'Brukes bare til klimanormaler.',
  'stackForm.search': 'Søk',
  'stackForm.noPlaces': 'Fant ingen steder som heter det.',
  'stackForm.searchFailed': 'Stedssøket svarte ikke. Prøv igjen når du har nett.',
  'stackForm.pickPlace': 'Velg et sted, så vet vi hvilket klima stabelen står i.',
  'stackForm.save': 'Lagre',
  'stackForm.cancel': 'Avbryt',
  'addStack.heading': 'Ny vedstabel',
  'addStack.species': 'Treslag',
  'addStack.secondSpecies': 'Blandet med noe annet?',
  'addStack.secondSpeciesNone': 'Nei, bare dette',
  'addStack.secondSpeciesShare': 'Hvor mye av det andre?',
  'addStack.stackedDate': 'Stablet dato',
  'addStack.volumeAmount': 'Mengde ({unit})',
  'addStack.volumeUnit': 'Enhet',
  'addStack.needName': 'Gi stabelen et navn, så finner du den igjen i lista.',

  'editStack.heading': 'Endre stabelen',
  'editStack.locationFailed':
    'Fikk ikke hentet klimadata for det nye stedet, så ingenting er lagret. Prøv igjen når du har nett.',

  'logReading.moistureLabel': 'Fuktighet (% av {basis})',
  'logReading.dateLabel': 'Målt dato',
  'logReading.rangeError': 'Fuktigheten må være mellom {min} og {max}.',
  'logReading.save': 'Lagre',

  'volumeEntry.kindLabel': 'Hva gjorde du?',
  'volumeEntry.amountLabel': 'Mengde ({unit})',
  'volumeEntry.unitLabel': 'Enhet',
  'volumeEntry.dateLabel': 'Dato',
  'volumeEntry.amountRange': 'Mengden må være et tall mellom 0 og {max}.',
  'volumeEntry.save': 'Lagre',

  'install.heading': 'Legg Woodstack på hjem-skjermen',
  'install.reason': 'Da åpner den fra hjem-skjermen som en vanlig app, og virker uten nett.',
  'install.ios': 'Trykk Del-knappen og velg «Legg til på Hjem-skjerm».',
  'install.install': 'Installer',
  'install.close': 'Lukk',

  'notify.heading': 'Få beskjed når veden er klar',
  'notify.reason':
    'Vi sier fra når stabelen er tørr nok til å fyre med, så du slipper å huske på det i månedsvis.',
  'notify.enable': 'Si fra',
  'notify.close': 'Lukk',

  // «Kan være klar», ikke «er klar»: modellen regner ut et vindu, ikke en
  // dato, og den som sjekker med måler rett etterpå skal ikke bli overrasket.
  'ready.body': '{name} kan være klar å fyre med nå. Sjekk gjerne med måler.',

  'chart.emptyLabel': 'Tørkekurve uten data',
  'chart.label': 'Tørkekurve: hvor tørr veden blir over tid, med grensen på {threshold}',

  'species.bjork': 'Bjørk',
  'species.or': 'Or',
  'species.osp': 'Osp',
  'species.furu': 'Furu',
  'species.gran': 'Gran',
  'species.eik': 'Eik',
  'species.bok': 'Bøk',

  'species.mixedLabel': '{primary} + {secondary} ({share})',
  'species.share.half': 'Omtrent halvparten',
  'species.share.third': 'En tredjedel eller så',
  'species.share.bit': 'Bare et innslag',

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
  // Ikke lenger til å velge for en ny føring, men beholdt fordi eldre
  // føringer fortsatt står i den — se VolumeUnit i storage/schema.ts.
  'volume.unit.stablet': 'Stablet kubikkmeter',
  'volume.unit.stablet60': 'Stablet kubikkmeter (60 cm)',
  'volume.unit.stablet30': 'Stablet kubikkmeter (30 cm)',
  'volume.unit.losKubikk': 'Løs kubikkmeter',
  'volume.unit.favn': 'Favn (2,4 m³ stablet)',
  'volume.unit.storfavn': 'Storfavn',
  'volume.unit.cord': 'Cord',
  'volume.unit.storsekk': 'Storsekk (1000 liter)',
  'volume.unit.sekk40': 'Sekk (40 liter)',
  'volume.unit.sekk60': 'Sekk (60 liter)',
  'volume.unit.sekk80': 'Sekk (80 liter)',
  'volume.unitShort.fastKubikk': 'm³ fast',
  'volume.unitShort.stablet': 'm³ stablet',
  'volume.unitShort.stablet60': 'm³ stablet 60 cm',
  'volume.unitShort.stablet30': 'm³ stablet 30 cm',
  'volume.unitShort.losKubikk': 'm³ løs',
  'volume.unitShort.favn': 'favner',
  'volume.unitShort.storfavn': 'storfavner',
  'volume.unitShort.cord': 'cord',
  'volume.unitShort.storsekk': 'storsekker',
  'volume.unitShort.sekk40': '40-liters sekker',
  'volume.unitShort.sekk60': '60-liters sekker',
  'volume.unitShort.sekk80': '80-liters sekker',

  'units.moistureBasis': 'tørrvekt',
  'units.monthPart.beginning': 'begynnelsen',
  'units.monthPart.middle': 'midten',
  'units.monthPart.end': 'slutten',
  'units.monthPart.of': 'av',
} as const

export type TranslationKey = keyof typeof nb
