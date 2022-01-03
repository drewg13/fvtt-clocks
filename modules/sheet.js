import { Clock } from "./clock.js";
import { getSystemMapping } from "./systems/index.js";
import { log, warn } from "./util.js";

const DISPLAY_NAME = {
  ALWAYS_FOR_EVERYONE: 50
};
const DISPOSITION = {
  NEUTRAL: 0
};
const DEFAULT_TOKEN = {
  scale: 1,
  disposition: DISPOSITION.NEUTRAL,
  displayName: DISPLAY_NAME.ALWAYS_FOR_EVERYONE,
  actorLink: true
};

export class ClockSheet extends ActorSheet {
  static get defaultOptions() {
    const supportedSystem = getSystemMapping(game.data.system.id);
	  return foundry.utils.mergeObject(
      super.defaultOptions,
      {
        classes: ["clocks", "sheet", `clocks-system-${game.data.system.id}`, "actor", "npc"],
        template: "modules/clocks/templates/sheet.html",
        width: 350,
        height: 525,
        ...supportedSystem.sheetDefaultOptions
      }
    );
  }

  static register () {
    const supportedSystem = getSystemMapping(game.data.system.id);
    Actors.registerSheet(supportedSystem.id, ClockSheet, supportedSystem.registerSheetOptions);
    log("Sheet Registered");
  }

  constructor (...args) {
    super(...args);
    this._system = getSystemMapping(game.data.system.id);
  }

  get system () {
    return this._system;
  }

  getData () {
    const clock = new Clock(this.system.loadClockFromActor({ actor: this.actor }));
    return foundry.utils.mergeObject(super.getData(), {
      clock: {
        progress: clock.progress,
        size: clock.size,
        theme: clock.theme,
        image: {
          url: clock.image.img,
          width: clock.image.width,
          height: clock.image.height
        },
        settings: {
          sizes: Clock.sizes,
          themes: Clock.themes
        }
      }
    });
  }

  activateListeners (html) {
    super.activateListeners(html);

    html.find("button[name=minus]").click(async (ev) => {
      ev.preventDefault();
      const oldClock = new Clock(this.system.loadClockFromActor({ actor: this.actor }));
      await this.updateClock(oldClock.decrement());
    });

    html.find("button[name=plus]").click(async (ev) => {
      ev.preventDefault();
      const oldClock = new Clock(this.system.loadClockFromActor({ actor: this.actor }));
      await this.updateClock(oldClock.increment());
    });

    html.find("button[name=reset]").click(async (ev) => {
      ev.preventDefault();
      const oldClock = new Clock(this.system.loadClockFromActor({ actor: this.actor }));
      await this.updateClock(new Clock({
        theme: oldClock.theme,
        progress: 0,
        size: oldClock.size
      }));
    });
  }

  async _updateObject(_event, form) {
    await this.object.update({
      name: form.name
    });

    const oldClock = new Clock(this.system.loadClockFromActor({ actor: this.actor }));
    let newClock = new Clock({
      progress: oldClock.progress,
      size: form.size,
      theme: form.theme
    });
    await this.updateClock(newClock);
  }

  async updateClock(clock) {
    const actor = this.actor;

    // update associated tokens
    const tokens = actor.getActiveTokens();
    for (const t of tokens) {
      await t.document.update({
        name: actor.name,
        img: clock.image.img,
        actorLink: true
      });
    }

    // update the Actor
    const persistObj = await this.system.persistClockToActor({ actor, clock });
    const visualObj = {
      img: clock.image.img,
      token: {
        img: clock.image.img,
        ...DEFAULT_TOKEN
      }
    };
    await actor.update(foundry.utils.mergeObject(visualObj, persistObj));
  }
}

export default {

  renderTokenHUD: async (_hud, html, token) => {

    log("Render")
    let t = canvas.tokens.get(token.id);
    let a = game.actors.get(token.actorId);

    if( !a?.data?.flags?.clocks ) {
      return false;
    }

    const button1HTML = await renderTemplate('modules/clocks/templates/buttons-left.html');
    const button2HTML = await renderTemplate('modules/clocks/templates/buttons-right.html');

    html.find("div.left").append(button1HTML).click(async (event) => {
      log("HUD Clicked")
      // re-get in case there has been an update
      t = canvas.tokens.get(token.id);

      const oldClock = new Clock(a.data.flags.clocks);
      let newClock;

      const target = event.target.classList.contains("control-icon")
        ? event.target
        : event.target.parentElement;
      if (target.classList.contains("cycle-size")) {
        newClock = oldClock.cycleSize();
      } else if (target.classList.contains("cycle-theme")) {
        newClock = oldClock.cycleTheme();
      } else if (target.dataset.action) {
        return;
      } else {
        return error("ERROR: Unknown TokenHUD Button");
      }

      const persistObj = {
        flags: {
          clocks: {
            progress: newClock.progress,
            size: newClock.size,
            theme: newClock.theme
          }
        }
      };

      const visualObj = {
        img: newClock.image.img,
        token: {
          img: newClock.image.img,
          ...DEFAULT_TOKEN
        }
      };

      let newObj = foundry.utils.mergeObject(visualObj, persistObj);
      let tokenObj = {};
      let update = [];
      update.push( foundry.utils.mergeObject( { "_id": a.id }, newObj ) );
      await Actor.updateDocuments(update);

      update = [];
      const tokens = a.getActiveTokens();
      for (const t of tokens) {
        tokenObj = {
          _id: t.id,
          name: a.name,
          img: newClock.image.img,
          flags: newClock.flags,
          actorLink: true
        };
        update.push(tokenObj);
      }

      await TokenDocument.updateDocuments(update, {parent: game.scenes.current});
    });


    html.find("div.right").append(button2HTML).click(async (event) => {
      log("HUD Clicked")
      // re-get in case there has been an update
      t = canvas.tokens.get(token.id);

      const oldClock = new Clock(a.data.flags.clocks);
      let newClock;

      const target = event.target.classList.contains("control-icon")
        ? event.target
        : event.target.parentElement;
      if (target.classList.contains("progress-up")) {
        newClock = oldClock.increment();
      } else if (target.classList.contains("progress-down")) {
        newClock = oldClock.decrement();
      } else if (target.dataset.action) {
        return;
      } else {
        return error("ERROR: Unknown TokenHUD Button");
      }

      const persistObj = {
        flags: {
          clocks: {
            progress: newClock.progress,
            size: newClock.size,
            theme: newClock.theme
          }
        }
      };

      const visualObj = {
        img: newClock.image.img,
        token: {
          img: newClock.image.img,
          ...DEFAULT_TOKEN
        }
      };

      let newObj = foundry.utils.mergeObject(visualObj, persistObj);
      let tokenObj = {};
      let update = [];
      update.push( foundry.utils.mergeObject( { "_id": a.id }, newObj ) );
      await Actor.updateDocuments(update);

      update = [];
      const tokens = a.getActiveTokens();
      for (const t of tokens) {
        tokenObj = {
          _id: t.id,
          name: a.name,
          img: newClock.image.img,
          flags: newClock.flags,
          actorLink: true
        };
        update.push(tokenObj);
      }

      await TokenDocument.updateDocuments(update, {parent: game.scenes.current});
    });
    return true;
  }}

