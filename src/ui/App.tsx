import { useGame } from '../state/store'
import { BlindSelect } from './BlindSelect'
import { BossWash } from './BossWash'
import { CollectionScreen } from './CollectionScreen'
import { GameOverScreen, VictoryScreen } from './EndScreens'
import { GameScreen } from './GameScreen'
import { MenuScreen } from './MenuScreen'
import { MusicGlow } from './MusicGlow'
import { SettingsScreen } from './SettingsScreen'
import { ShopScreen } from './ShopScreen'

function Screen({ screen }: { screen: ReturnType<typeof useGame.getState>['screen'] }) {
  switch (screen) {
    case 'menu':
      return <MenuScreen />
    case 'blind-select':
      return <BlindSelect />
    case 'playing':
      return <GameScreen />
    case 'shop':
      return <ShopScreen />
    case 'game-over':
      return <GameOverScreen />
    case 'victory':
      return <VictoryScreen />
    case 'collection':
      return <CollectionScreen />
    case 'settings':
      return <SettingsScreen />
  }
}

export default function App() {
  const screen = useGame((s) => s.screen)
  return (
    <>
      <MusicGlow />
      <BossWash />
      <Screen screen={screen} />
    </>
  )
}
