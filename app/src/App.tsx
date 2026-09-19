import { Panel } from './ui/Panel';
import { useGame } from './ui/GameCanvas';
import styles from './App.module.css';

const WIDTH = 980;
const HEIGHT = 620;

export default function App() {
  const { canvasRef, game, snap } = useGame(WIDTH, HEIGHT);

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
      {snap && <Panel snap={snap} game={game.current} />}
    </div>
  );
}
