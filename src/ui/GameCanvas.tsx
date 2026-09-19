import { useEffect, useRef, useState } from 'react';
import { createGame, type Game, type Snapshot } from '../game';

/**
 * The only bridge between React and the game. React hands the core a canvas and gets
 * snapshots back; the core never calls into React, and the 60fps loop never touches
 * component state.
 */
export function useGame(width: number, height: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createGame(canvas);
    gameRef.current = game;
    const unsubscribe = game.subscribe(setSnap);
    const unbind = game.bindKeys();
    game.start();
    return () => {
      game.stop();
      unbind();
      unsubscribe();
      gameRef.current = null;
    };
  }, [width, height]);

  return { canvasRef, game: gameRef, snap };
}
