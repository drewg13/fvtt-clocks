import { ClockSheet } from "./sheet.js";
import Tiles from "./tiles.js";
import Tokens from "./sheet.js";
import { log } from "./util.js";

Hooks.once("init", () => {
  log(`Init ${game.system.id}`);
  ClockSheet.register();
});

Hooks.on("getSceneControlButtons", (controls) => {
  Tiles.getSceneControlButtons(controls);
});

Hooks.on("renderTileHUD", async (hud, html, tile) => {
  await Tiles.renderTileHUD(hud, html, tile);
});

Hooks.on("renderTokenHUD", async (hud, html, token) => {
  let rootElement = document.getElementsByClassName('vtt game')[0];
  if( await Tokens.renderTokenHUD(hud, html, token) ) {
    rootElement.classList.add('hide-ui');
  } else {
    rootElement.classList.remove('hide-ui');
  }
});
