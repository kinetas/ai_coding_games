import { LobbyScene }   from './scenes/LobbyScene.js';
import { RoomScene }    from './scenes/RoomScene.js';
import { WaitingScene } from './scenes/WaitingScene.js';
import { GameScene }    from './scenes/GameScene.js';
import { ResultScene }  from './scenes/ResultScene.js';

const config = {
  type:            Phaser.AUTO,
  parent:          'game-container',
  width:           1280,
  height:          720,
  backgroundColor: '#070402',
  dom:             { createContainer: true },
  scene:           [LobbyScene, RoomScene, WaitingScene, GameScene, ResultScene],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

export const game = new Phaser.Game(config);
window.__game = game;
