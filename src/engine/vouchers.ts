// Vouchers — permanent run upgrades. One is offered per ante in the shop.

import type { VoucherDef } from './types'

const defs: VoucherDef[] = [
  { id: 'crowbar', name: 'Crowbar', description: '+1 discard every round', cost: 8 },
  { id: 'perpetual-motion', name: 'Perpetual Motion', description: '+1 recycle every round', cost: 8 },
  { id: 'grease-fingers', name: 'Grease Fingers', description: 'Rerolls cost $2 less (minimum $1)', cost: 7 },
  { id: 'deep-pockets', name: 'Deep Pockets', description: 'Interest cap raised from $5 to $10', cost: 8 },
  { id: 'tithe', name: 'Tithe', description: 'Blind rewards pay +$2', cost: 8 },
  { id: 'expansion', name: 'Expansion', description: '+1 joker slot', cost: 10 },
  { id: 'satchel', name: 'Satchel', description: '+1 god card slot', cost: 8 },
  { id: 'lucky-charm', name: 'Lucky Charm', description: 'Card packs offer 4 choices instead of 3', cost: 7 },
  { id: 'showcase', name: 'Showcase', description: 'The shop offers 3 jokers instead of 2', cost: 9 },
  { id: 'seal-of-approval', name: 'Seal of Approval', description: 'Shop jokers are twice as likely to have editions', cost: 8 },
]

export const voucherRegistry: Record<string, VoucherDef> = Object.fromEntries(defs.map((d) => [d.id, d]))

export const allVoucherIds = defs.map((d) => d.id)

export function hasVoucher(vouchers: string[], id: string): boolean {
  return vouchers.includes(id)
}
