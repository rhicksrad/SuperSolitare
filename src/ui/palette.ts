// Shared pixel-art palette and sprite shape. Lives outside sprites.tsx so
// component files only export components (react-refresh constraint).

export interface SpriteDef {
  grid: string[]
  palette?: Record<string, string>
  /** css background for the card's art window */
  bg?: string
}

export const BASE_PALETTE: Record<string, string> = {
  K: '#131625', // ink outline
  N: '#232a45', // navy shade
  W: '#f7f3e8', // paper white
  w: '#cfc7b2', // paper shade
  G: '#ffbe3d', // gold
  g: '#c9861e', // gold shade
  Y: '#ffe066', // light gold
  R: '#ff5252', // red
  r: '#b52e3c', // red shade
  B: '#4fa8ff', // chip blue
  b: '#2a5fc4', // blue shade
  E: '#46d98b', // green
  e: '#2a9560', // green shade
  P: '#c06bf5', // purple
  p: '#7e3fb2', // purple shade
  O: '#ff9040', // orange
  o: '#b25a1d', // orange shade / wood
  C: '#7ee7f0', // cyan
  c: '#3fa8b8', // cyan shade
  S: '#9aa7c4', // steel
  s: '#5a6484', // steel shade
  F: '#ffd9b0', // skin/light warm
  M: '#8b93ad', // mist
  A: '#2f3854', // court garment — recolored per suit by CardView
}
