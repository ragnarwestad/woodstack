import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { StackList } from './StackList'
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
