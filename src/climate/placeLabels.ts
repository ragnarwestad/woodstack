/** What a place is called on screen. Shared by the two stack forms so a place
 *  reads the same whether it is being picked for a new pile or changed on an
 *  old one. */

type Named = { name: string; country?: string; admin1?: string }

/** Name and country, not the region in between. Open-Meteo has no Norwegian
 *  name for every admin region and falls back to English per field, so
 *  "Oslo, Oslo County, Norge" was half one language and half the other. The
 *  region is what a Norwegian would drop anyway. */
export function placeLabel(place: Named): string {
  return [place.name, place.country].filter(Boolean).join(', ')
}

/** One label per match, guaranteed unique, because the dropdown refuses
 *  duplicate options by THROWING — and a thrown error there takes the whole
 *  page down, which is what a search for "Oslo" used to do.
 *
 *  Two passes: add the region where two matches would otherwise read alike,
 *  and then drop any that are still identical. Open-Meteo really does return
 *  the same place twice — same name, same region, same country — and no amount
 *  of extra words tells those apart, so showing one of them is the honest
 *  answer. The matches are filtered with the labels, so the two stay aligned. */
export function labelledMatches<T extends Named>(results: T[]): { result: T; label: string }[] {
  const plain = results.map(placeLabel)
  const count = new Map<string, number>()
  for (const label of plain) count.set(label, (count.get(label) ?? 0) + 1)

  const seen = new Set<string>()
  const out: { result: T; label: string }[] = []
  results.forEach((result, index) => {
    const short = plain[index]
    const label =
      (count.get(short) ?? 0) > 1 && result.admin1
        ? [result.name, result.admin1, result.country].filter(Boolean).join(', ')
        : short
    if (seen.has(label)) return
    seen.add(label)
    out.push({ result, label })
  })
  return out
}
