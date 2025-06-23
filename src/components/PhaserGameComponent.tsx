import React, { useEffect, useRef } from 'react';
import { PhaserGameManager } from '../game/PhaserGame.ts';

interface PhaserGameComponentProps {
  className?: string;
  onGameReady?: (gameManager: PhaserGameManager) => void;
}

const PhaserGameComponent: React.FC<PhaserGameComponentProps> = ({ 
  className = '', 
  onGameReady 
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<PhaserGameManager | null>(null);
  const onGameReadyRef = useRef(onGameReady);

  // onGameReadyが変更されたら参照を更新
  useEffect(() => {
    onGameReadyRef.current = onGameReady;
  }, [onGameReady]);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    // ゲームマネージャーを初期化
    const gameManager = new PhaserGameManager('phaser-game-container');
    gameManagerRef.current = gameManager;
    
    // ゲームを開始
    gameManager.init();

    // 親コンポーネントに通知
    if (onGameReadyRef.current) {
      onGameReadyRef.current(gameManager);
    }

    // クリーンアップ
    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy();
        gameManagerRef.current = null;
      }
    };
  }, []); // 依存配列を空にして、マウント時のみ実行

  return (
    <div 
      className={`phaser-game-container ${className}`}
      style={{
        width: '100%',
        height: '600px',
        minHeight: '600px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div 
        id="phaser-game-container" 
        ref={gameContainerRef}
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};

export default PhaserGameComponent;