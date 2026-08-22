import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
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
    renderWithMantine(<StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText('Bjørk ved veggen')).toBeInTheDocument()
    expect(screen.getByText('Granstabelen')).toBeInTheDocument()
  })

  it('shows a window, not a single date', () => {
    renderWithMantine(<StackList stacks={[stacks[0]]} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/klar mellom/i)).toBeInTheDocument()
  })

  it('says it is fetching climate data when the location has no normals yet', () => {
    renderWithMantine(<StackList stacks={[stacks[0]]} normalsFor={() => null} onSelect={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/henter klimadata/i)).toBeInTheDocument()
  })

  it('selects the stack that was clicked', () => {
    const onSelect = vi.fn()
    renderWithMantine(<StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={onSelect} onAdd={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /granstabelen/i }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('invites the first stack when there are none', () => {
    renderWithMantine(<StackList stacks={[]} normalsFor={() => null} onSelect={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/ingen vedstabler/i)).toBeInTheDocument()
  })
})

describe('StackList in English', () => {
  it('translates the list chrome and the species name, keeping the visitor’s own stack names', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<StackList stacks={stacks} normalsFor={() => OSLO_NORMALS} onSelect={vi.fn()} onAdd={vi.fn()} />)

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
    renderWithMantine(<StackList stacks={[stacks[0]]} normalsFor={() => null} onSelect={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(/fetching climate data/i)).toBeInTheDocument()
  })
})
