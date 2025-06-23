import React, { useState, useCallback } from 'react';
import PhaserGameComponent from './components/PhaserGameComponent.tsx';
import { PhaserGameManager } from './game/PhaserGame.ts';
import { UserSettings } from './types/game.ts';
import './App.css';

function App() {
  const [gameManager, setGameManager] = useState<PhaserGameManager | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({
    fontSize: 'medium',
    contrast: 'normal',
    soundVolume: 70, // 固定値（内部処理用）
    autoPlay: true,
    colorBlindSupport: false,
    motionReduced: false,
  });

  const handleGameReady = useCallback((manager: PhaserGameManager) => {
    setGameManager(manager);
    manager.updateSettings(settings);
  }, [settings]);

  // 音量調整機能を削除（PC/スマホの本体音量で調整）

  const switchScene = (sceneKey: string) => {
    console.log('Switching to scene:', sceneKey);
    if (gameManager) {
      console.log('GameManager exists, calling switchScene');
      gameManager.switchScene(sceneKey);
    } else {
      console.log('GameManager not ready yet');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)' }}>
      {/* ヘッダー */}
      <header style={{ 
        background: 'white', 
        padding: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          maxWidth: '1024px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#3b82f6',
            margin: 0 
          }}>
            まなびのじかん（Phaser版）
          </h1>
          <button
            onClick={() => setShowControls(!showControls)}
            style={{
              background: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {showControls ? 'コントロール非表示' : 'コントロール表示'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1536px', margin: '0 auto', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* コントロールパネル */}
          {showControls && (
            <div style={{ flex: '0 0 300px' }}>
              <div style={{ 
                background: 'white', 
                borderRadius: '1rem', 
                boxShadow: '0 10px 15px rgba(0,0,0,0.1)', 
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: '#374151',
                  marginBottom: '1rem',
                  marginTop: 0
                }}>
                  ゲームコントロール
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    onClick={() => switchScene('MenuScene')}
                    style={{
                      width: '100%',
                      background: '#ff69b4',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    メニュー
                  </button>
                  <button
                    onClick={() => switchScene('HiraganaScene')}
                    style={{
                      width: '100%',
                      background: '#87ceeb',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ひらがな
                  </button>
                  <button
                    onClick={() => switchScene('NumberScene')}
                    style={{
                      width: '100%',
                      background: '#98fb98',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    すうじ
                  </button>
                </div>
              </div>

              <div style={{ 
                background: 'white', 
                borderRadius: '1rem', 
                boxShadow: '0 10px 15px rgba(0,0,0,0.1)', 
                padding: '1.5rem'
              }}>
                <h3 style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: '#374151',
                  marginBottom: '1rem',
                  marginTop: 0
                }}>
                  ヒント
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    🔊 音量調整は、PC・スマホ・タブレットの本体音量でお願いします
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ゲームエリア */}
          <div style={{ flex: '1', minWidth: '0' }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '1rem', 
              boxShadow: '0 10px 15px rgba(0,0,0,0.1)', 
              overflow: 'hidden',
              padding: '1rem'
            }}>
              <PhaserGameComponent 
                className="game-container"
                onGameReady={handleGameReady}
              />
            </div>
          </div>
        </div>
      </div>

      {/* フッター */}
      <footer style={{ 
        background: '#1f2937', 
        color: 'white', 
        textAlign: 'center', 
        padding: '1.5rem',
        marginTop: '2rem'
      }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>小学校入学準備知育アプリ - Phaser.js × React版</p>
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#9ca3af',
          margin: 0
        }}>
          発達障害・グレーゾーンのお子さんも安心して学習できます
        </p>
      </footer>
    </div>
  );
}

export default App;