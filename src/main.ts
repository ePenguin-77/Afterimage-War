import "./styles.css";
import { Game } from "./Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Canvas element #game was not found.");
}

const game = new Game(canvas);
game.start();

declare global {
  interface Window {
    __afterimageWar?: Game;
  }
}

window.__afterimageWar = game;
