import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { StackList } from './StackList'
import { dryingProgress, estimateWindow } from '../model/simulate'
import { renderWithMantine } from '../test/render'
import { OSLO_NORMALS, makeStack } from '../test/fixtures'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const stacks = [
  makeStack({ id: 'a', name: 'Bjørk ved veggen' }),
  makeStack({ id: 'b', name: 'Granstabelen', species: 'gran' }),
]

describe('StackList', () => {
  it('lists every stack by name', () => {
    renderWithMantine(<StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('Bjørk ved veggen')).toBeInTheDocument()
    expect(screen.getByText('Granstabelen')).toBeInTheDocument()
  })

  /** The reported bug: the heading (and the add button beside it) scrolled
   *  away with the very first swipe, while `AppHeader` stayed put above it.
   *  `AppHeader` publishes its own rendered height as `--ws-header-height`,
   *  and this row reads it back as its own sticky `top` so it stays pinned
   *  just below the header instead — only the list itself still scrolls.
   *
   *  The `top` value itself is NOT checked here: happy-dom drops a `var(...)`
   *  value out of a `top` declaration entirely, the same way it drops
   *  `calc(var(...))` elsewhere in this app's styles (see `AppHeader.tsx`'s
   *  own note on its margins). `position: sticky` is what survives, and what
   *  this asserts; the offset itself wants a look at a real narrow screen. */
  it('pins the heading row under the header instead of letting it scroll away', () => {
    renderWithMantine(<StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)

    const row = screen.getByRole('heading', { name: /vedstablene mine/i }).closest('[class*="Group"]') as HTMLElement
    expect(row.style.position).toBe('sticky')
  })

  /** The reported bug: this row is taller than the comparison and need
   *  screens' own heading rows, since the button in it is taller than any
   *  heading alone — so the three rows came out three different heights
   *  instead of reading as one shape. Pinned to the button's own height,
   *  the same value the other two rows are pinned to as well. */
  it('gives the heading row the same height the button in it needs', () => {
    renderWithMantine(<StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)

    const row = screen.getByRole('heading', { name: /vedstablene mine/i }).closest('[class*="Group"]') as HTMLElement
    expect(row.style.minHeight).toBe('52px')
  })

  /** Bungee is a display face with a single weight. Asking the browser for a
   *  bold it does not have makes it synthesise one, which a signage face wears
   *  badly — so the name asks for 400 and gets the drawn shapes. */
  /** Bungee draws capitals only, so it turned "Bjørk ved veggen" into a
   *  shout — and a stack's name is the visitor's own words, often a whole
   *  sentence. Bungee keeps what is set at 16 px or more: the wordmark, the
   *  headings and the three result lines. */
  it('sets stack names in the body face, not the display one', () => {
    renderWithMantine(<StackList stacks={[stacks[0]]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    const name = screen.getByText('Bjørk ved veggen')
    expect(getComputedStyle(name).fontFamily).not.toContain('Bungee')
  })

  it('shows a window, not a single date', () => {
    renderWithMantine(<StackList stacks={[stacks[0]]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/klar mellom/i)).toBeInTheDocument()
  })

  it('says it is fetching climate data when the location has no normals yet', () => {
    renderWithMantine(<StackList stacks={[stacks[0]]} normalsFor={() => null} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/henter klimadata/i)).toBeInTheDocument()
  })

  it('selects the stack that was clicked', () => {
    const onSelect = vi.fn()
    renderWithMantine(<StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={onSelect}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /granstabelen/i }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('names both woods when a pile is mixed', () => {
    const mixed = makeStack({ id: 'c', name: 'Blandingsstabelen', secondSpecies: { species: 'gran', share: 'third' } })
    renderWithMantine(<StackList stacks={[mixed]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('Bjørk + Gran (En tredjedel eller så)')).toBeInTheDocument()
  })

  it('names only the one wood when a pile is not mixed', () => {
    renderWithMantine(<StackList stacks={[stacks[0]]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('Bjørk')).toBeInTheDocument()
  })

  it('shows the photo of a stack that has one, and nothing extra for one that has not', () => {
    const withPhoto = makeStack({ id: 'c', name: 'Bak fjøset', photo: 'data:image/jpeg;base64,thumb' })
    renderWithMantine(
      <StackList stacks={[stacks[0], withPhoto]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />,
    )

    const photos = screen.getAllByAltText(/bilde av vedstabelen/i)
    expect(photos).toHaveLength(1)
    expect(photos[0]).toHaveAttribute('src', 'data:image/jpeg;base64,thumb')
  })

  /** The reported bug: the ring counted towards the ready-window, so a stack
   *  put up in April read 0 % through a whole summer of real drying. */
  it('shows a ring that has moved, months before the ready-window opens', () => {
    const stack = makeStack({ id: 'a', name: 'Bjørk ved veggen', stackedDate: '2026-04-15' })
    const today = new Date('2026-07-15T00:00:00Z')
    expect(today.getTime()).toBeLessThan(estimateWindow(stack, OSLO_NORMALS).earliest.getTime())

    renderWithMantine(<StackList stacks={[stack]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} today={today} />)

    expect(screen.queryByText('0 %')).not.toBeInTheDocument()
  })

  /** The one state worth seeing across a room. It reads the same number the
   *  ring already has, so the card and the ring can never disagree — and 99 %
   *  is not ready, however close it looks. */
  it('marks a row ready only once the wood is all the way dry', () => {
    const stack = makeStack({ id: 'a', name: 'Bjørk ved veggen' })
    const almost = new Date('2027-01-01T00:00:00Z')
    const dry = new Date('2027-06-01T00:00:00Z')
    expect(dryingProgress(stack, OSLO_NORMALS, almost)).toBeLessThan(100)
    expect(dryingProgress(stack, OSLO_NORMALS, dry)).toBe(100)

    const notYet = renderWithMantine(<StackList stacks={[stack]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} today={almost} />)
    expect(screen.getByText('Bjørk ved veggen').closest('[data-ready]')).toBeNull()
    notYet.unmount()

    renderWithMantine(<StackList stacks={[stack]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} today={dry} />)
    expect(screen.getByText('Bjørk ved veggen').closest('[data-ready]')).toHaveAttribute('data-ready', 'true')
  })

  /** Red on saturated teal is the pairing that reads as a mistake, and the
   *  ready row is the only place in the app where a delete button lands on a
   *  filled card. On the cream rows it stays red — that is the half of this
   *  that a blanket change would have quietly broken. */
  it('takes the ready card\'s colour for its delete button, and stays red elsewhere', () => {
    const stack = makeStack({ id: 'a', name: 'Bjørk ved veggen' })
    const almost = new Date('2027-01-01T00:00:00Z')
    const dry = new Date('2027-06-01T00:00:00Z')

    const notYet = renderWithMantine(<StackList stacks={[stack]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} today={almost} />)
    expect(screen.getByRole('button', { name: /slett/i }).getAttribute('style')).not.toContain('inherit')
    notYet.unmount()

    renderWithMantine(<StackList stacks={[stack]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} today={dry} />)
    expect(screen.getByRole('button', { name: /slett/i }).getAttribute('style')).toContain('color: inherit')
  })

  it('invites the first stack when there are none', () => {
    renderWithMantine(<StackList stacks={[]} normalsFor={() => null} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/ingen vedstabler/i)).toBeInTheDocument()
  })
})

describe('StackList in English', () => {
  it('translates the list chrome and the species name, keeping the visitor’s own stack names', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)

    expect(screen.getByText('My woodpiles')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new woodpile/i })).toBeInTheDocument()
    expect(screen.getAllByText(/ready between/i)).toHaveLength(2)
    expect(screen.getByText('Birch')).toBeInTheDocument()
    expect(screen.getByText('Spruce')).toBeInTheDocument()
    expect(screen.queryByText('Bjørk')).not.toBeInTheDocument()
    expect(screen.getByText('Bjørk ved veggen')).toBeInTheDocument()
  })

  it('says it is fetching climate data in English too', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<StackList stacks={[stacks[0]]} normalsFor={() => null} onSelect={vi.fn()}
      onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/fetching climate data/i)).toBeInTheDocument()
  })

  /** Deleting belongs beside the pile it removes. On the stack page it was two
   *  screens in, with nothing on screen showing which one was about to go. */
  it('deletes the row it sits in, not another one', () => {
    const onDelete = vi.fn()
    renderWithMantine(
      <StackList
        stacks={[makeStack({ id: 'a', name: 'Bjørk ved veggen' }), makeStack({ id: 'b', name: 'Grana bak låven' })]}
        normalsFor={() => OSLO_NORMALS}
        onSelect={vi.fn()}
        onDelete={onDelete}
        onAdd={vi.fn()}
      />,
    )

    const row = screen.getByText('Grana bak låven').closest('[class*="Paper"]') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: /^slett$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    expect(onDelete).toHaveBeenCalledWith('b')
  })

  it('opens the stack when the row itself is clicked, not when it is deleted', () => {
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    renderWithMantine(
      <StackList
        stacks={[makeStack({ id: 'a', name: 'Bjørk ved veggen' })]}
        normalsFor={() => OSLO_NORMALS}
        onSelect={onSelect}
        onDelete={onDelete}
        onAdd={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^slett$/i }))
    expect(onSelect).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })
})

/** Three stacks nobody entered, in a list headed "Vedstablene mine", are a
 *  small lie unless the list says where they came from. */
describe('StackList marking the app’s own example stacks', () => {
  it('says so on the stack the app seeded, and on no other', () => {
    renderWithMantine(
      <StackList
        stacks={stacks}
        normalsFor={() => OSLO_NORMALS}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onAdd={vi.fn()}
        isExample={(stack) => stack.id === 'a'}
      />,
    )

    const seeded = screen.getByText('Bjørk ved veggen').closest('[class*="Paper"]') as HTMLElement
    expect(within(seeded).getByText('Eksempel')).toBeInTheDocument()

    const own = screen.getByText('Granstabelen').closest('[class*="Paper"]') as HTMLElement
    expect(within(own).queryByText('Eksempel')).not.toBeInTheDocument()
  })

  it('says nothing about examples when the list is not told about any', () => {
    renderWithMantine(
      <StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()}
        onDelete={vi.fn()} onAdd={vi.fn()} />,
    )
    expect(screen.queryByText('Eksempel')).not.toBeInTheDocument()
  })

  it('translates the label', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(
      <StackList
        stacks={[stacks[0]]}
        normalsFor={() => OSLO_NORMALS}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onAdd={vi.fn()}
        isExample={() => true}
      />,
    )
    expect(screen.getByText('Example')).toBeInTheDocument()
  })
})
