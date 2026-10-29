import { describe, expect, it } from 'vitest'
import { parseIntent } from '../src/bella/parse'
import { QUICK_PROMPTS } from '../src/bella/fixtures'

describe('parseIntent — quick prompts', () => {
  it('prompt 1: spicy, ₦6k, Yaba, 30 mins', () => {
    const i = parseIntent(QUICK_PROMPTS[0])
    expect(i.budget).toBe(6000)
    expect(i.area).toBe('yaba')
    expect(i.maxMinutes).toBe(30)
    expect(i.spicy).toBe(true)
    expect(i.cravings).toContain('spicy')
    expect(i.groupOrder).toBeFalsy()
  })
  it('prompt 2: lunch for 5 in Lekki, ₦25k total', () => {
    const i = parseIntent(QUICK_PROMPTS[1])
    expect(i.people).toBe(5)
    expect(i.area).toBe('lekki')
    expect(i.budget).toBe(25000)
    expect(i.budgetMode).toBe('total')
    expect(i.groupOrder).toBe(true)
    expect(i.mealTime).toBe('lunch')
  })
  it('prompt 3: healthy breakfast near Ikeja, no pork', () => {
    const i = parseIntent(QUICK_PROMPTS[2])
    expect(i.area).toBe('ikeja')
    expect(i.mealTime).toBe('breakfast')
    expect(i.cravings).toContain('healthy')
    expect(i.dietaryRestrictions).toEqual(['no-pork'])
    expect(i.budget).toBeUndefined()
  })
  it('prompt 4: swallow + assorted meat, Surulere, starving → fast', () => {
    const i = parseIntent(QUICK_PROMPTS[3])
    expect(i.area).toBe('surulere')
    expect(i.cravings).toEqual(expect.arrayContaining(['swallow', 'assorted meat']))
    expect(i.urgent).toBe(true)
    expect(i.maxMinutes).toBe(30)
    expect(i.maxMinutesInferred).toBe(true)
    expect(i.dietaryRestrictions).toEqual([])
  })
})

describe('parseIntent — budgets', () => {
  it.each([
    ['meal for ₦6,000', 6000],
    ['6k', 6000],
    ['something for 6000', 6000],
    ['under 5', 5000],
    ['under 10k', 10000],
    ['₦25k total for the team', 25000],
    ['budget is 8 thousand', 8000],
  ])('%s → %d', (text, expected) => {
    expect(parseIntent(text).budget).toBe(expected)
  })
  it('missing budget is undefined, never zero', () => {
    expect(parseIntent('cheap food').budget).toBeUndefined()
    expect(parseIntent('cheap food').priceFocus).toBe('value')
    expect(parseIntent('cheapest food').priceFocus).toBe('cheapest')
  })
  it('does not read minutes or people as money', () => {
    const i = parseIntent('for 2 in 45 mins')
    expect(i.budget).toBeUndefined()
    expect(i.people).toBe(2)
    expect(i.maxMinutes).toBe(45)
  })
  it('per-person budgets are distinguished from totals', () => {
    const i = parseIntent('lunch for 4, 5k each')
    expect(i.budget).toBe(5000)
    expect(i.budgetMode).toBe('per-person')
    expect(i.people).toBe(4)
  })
})

describe('parseIntent — areas, time, people', () => {
  it.each([
    ['pizza in VI', 'vi'],
    ['Victoria Island please', 'vi'],
    ['Ikeja GRA', 'ikeja'],
    ['Lekki Phase 1 lunch', 'lekki'],
    ['gbagada', 'gbagada'],
    ['ogudu', 'ogudu'],
    ['maryland', 'maryland'],
    ['oregun', 'oregun'],
    ['opebi', 'opebi'],
    ['ikotun', 'ikotun'],
    ['ikoyi', 'ikoyi'],
    ['ajah', 'ajah'],
  ])('%s → %s', (text, area) => {
    expect(parseIntent(text).area).toBe(area)
  })
  it('Ikeja GRA keeps the GRA detail; "Lekki Phase 1" is not a budget', () => {
    expect(parseIntent('Ikeja GRA').areaDetail).toBe('GRA')
    expect(parseIntent('Lekki Phase 1').budget).toBeUndefined()
  })
  it('near me uses the selected area (no area invented)', () => {
    const i = parseIntent('Cheapest filling food near me')
    expect(i.nearMe).toBe(true)
    expect(i.area).toBeUndefined()
    expect(i.cravings).toContain('filling')
  })
  it.each([
    ['in 30 mins', 30],
    ['30 minutes max', 30],
    ['fast', 30],
    ['ASAP', 30],
  ])('time: %s → %d', (t, m) => expect(parseIntent(t).maxMinutes).toBe(m))
  it('meal times', () => {
    expect(parseIntent('late night suya').mealTime).toBe('late-night')
    expect(parseIntent('for breakfast').mealTime).toBe('breakfast')
    expect(parseIntent('dinner').mealTime).toBe('dinner')
  })
  it.each([
    ['for 5', 5],
    ['for five', 5],
    ['me and my babe', 2],
    ['for two', 2],
    ['for 2', 2],
  ])('people: %s → %d', (t, n) => {
    const i = parseIntent(t)
    expect(i.people).toBe(n)
    expect(i.groupOrder).toBe(true)
  })
})

describe('parseIntent — extra prompts', () => {
  it('Jollof and chicken for 2 under 10k', () => {
    const i = parseIntent('Jollof and chicken for 2 under 10k')
    expect(i).toMatchObject({ people: 2, budget: 10000, groupOrder: true })
    expect(i.cravings).toEqual(expect.arrayContaining(['jollof', 'chicken']))
  })
  it('Pizza night in VI', () => expect(parseIntent('Pizza night in VI')).toMatchObject({ area: 'vi', cravings: ['pizza'] }))
  it('Late night suya in Ogudu', () =>
    expect(parseIntent('Late night suya in Ogudu')).toMatchObject({ area: 'ogudu', mealTime: 'late-night', cravings: ['suya'] }))
  it('Something sweet', () => expect(parseIntent('Something sweet').cravings).toEqual(['sweet']))
  it('vegetarian and pork exclusions', () => {
    expect(parseIntent('vegetarian lunch').dietaryRestrictions).toContain('vegetarian')
    expect(parseIntent('pork-free please').dietaryRestrictions).toContain('no-pork')
  })
})
