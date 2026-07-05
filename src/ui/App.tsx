import { useGame } from '../state/store'
import { BlindSelect } from './BlindSelect'
import { GameOverScreen, VictoryScreen } from './EndScreens'
import { GameScreen } from './GameScreen'
import { MenuScreen } from './MenuScreen'
import { ShopScreen } from './ShopScreen'

export default function App() {
  const screen = useGame((s) => s.screen)
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
  }
}
