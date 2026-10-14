/** Optional, manually opened project information window. No game-state access. */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const SYSTEM_ID = "tencandles-ga";

export class TenCandlesAbout extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "tencandles-ga-about",
    classes: ["tencandles-ga", "etc-about"],
    tag: "section",
    position: { width: 450, height: "auto" },
    window: { resizable: false, icon: "fa-solid fa-circle-info" }
  };

  static PARTS = {
    main: { template: `systems/${SYSTEM_ID}/templates/apps/about.hbs` }
  };

  get title() { return game.i18n.localize("ETC.About.Title"); }

  static open() {
    const existing = [...this.instances()].find((app) => app.rendered);
    if (existing) {
      existing.bringToFront();
      return existing;
    }
    const app = new this();
    void app.render(true);
    return app;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const packageData = game.system;
    return {
      ...context,
      systemName: packageData?.title ?? "Ten Candles – Game Assistant",
      systemVersion: packageData?.version ?? "",
      repositoryUrl: packageData?.url?.startsWith("https://github.com/") ? packageData.url : null,
      coffeeUrl: "https://ko-fi.com/evilbram"
    };
  }
}

/** Append an idempotent player-accessible entry to the V14 settings sidebar. */
export function mountAboutInSettings(app, element) {
  if (!(element instanceof HTMLElement)) return;
  if (element.querySelector(".etc-about-settings-entry")) return;
  const target = element.querySelector(".settings-sidebar")
    ?? element.querySelector(".tab")
    ?? element;
  const section = document.createElement("section");
  section.className = "etc-about-settings-entry";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "etc-about-settings-button";
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-circle-info";
  icon.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "etc-about-settings-label";
  label.textContent = game.i18n.localize("ETC.About.SidebarEntry");
  button.append(icon, label);
  button.addEventListener("click", () => TenCandlesAbout.open());
  section.append(button);
  target.append(section);
}
