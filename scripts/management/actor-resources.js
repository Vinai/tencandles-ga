/**
 * Corrections explicites des états mécaniques individuels depuis la régie MJ.
 */

import {
  INSTANT_STATUSES
} from "../constants.js";

import {
  getCollectiveState,
  isActiveGM
} from "../state/game-state.js";

import {
  discardInstantRequestForActor
} from "../instant/manager.js";

import { tryLockPartyLifecycle, unlockPartyLifecycle } from "./party-lock.js";

export function getWorldCharacterActors() {
  const locale = game.i18n?.lang ?? "fr";

  return game.actors
    .filter((actor) => actor.type === "character")
    .sort((left, right) =>
      String(left.name ?? "").localeCompare(
        String(right.name ?? ""),
        locale,
        { sensitivity: "base" }
      )
    );
}

export async function updateCharacterResourceStates(
  actorId,
  {
    viceAvailable,
    virtueAvailable,
    momentStatus,
    brinkConsumed = false
  }
) {
  if (!isActiveGM()) {
    throw new Error(
      game.i18n.localize("ETC.Notifications.ActiveGMOnly")
    );
  }

  const state = getCollectiveState();
  if (state.activeResolution) {
    throw new Error(
      game.i18n.localize(
        "ETC.ActorManagement.ConflictBlocked"
      )
    );
  }

  const actor = game.actors.get(actorId);
  if (!actor || actor.type !== "character") {
    throw new Error(
      game.i18n.localize(
        "ETC.ActorManagement.InvalidCharacter"
      )
    );
  }

  const normalizedMomentStatus = Object.values(
    INSTANT_STATUSES
  ).includes(momentStatus)
    ? momentStatus
    : INSTANT_STATUSES.IDLE;

  if (normalizedMomentStatus !== INSTANT_STATUSES.IDLE) {
    await discardInstantRequestForActor(actor);
  }

  await actor.update({
    "system.vice.available": Boolean(viceAvailable),
    "system.virtue.available": Boolean(virtueAvailable),
    "system.moment.status": normalizedMomentStatus,
    "system.brink.burned": Boolean(brinkConsumed),
    "system.hopeLost": Boolean(brinkConsumed),
    ...(normalizedMomentStatus === INSTANT_STATUSES.IDLE ? {"system.hope.givenAway": false} : {})
  });

  return actor;
}

/** GM-only Martyrdom transfer; world actors only. */
export async function transferHopeDieGM(fromId, toId) {
  if (!isActiveGM()) throw new Error(game.i18n.localize("ETC.Notifications.ActiveGMOnly"));
  if (getCollectiveState().activeResolution) throw new Error(game.i18n.localize("ETC.ActorManagement.ConflictBlocked"));
  if (!tryLockPartyLifecycle("gm-hope-transfer")) {
    throw new Error(game.i18n.localize("ETC.Notifications.PartyActionBusy"));
  }
  try {
  const giver = game.actors.get(fromId);
  const receiver = game.actors.get(toId);
  if (!giver || !receiver || giver === receiver || giver.type !== "character" || receiver.type !== "character"
      || giver.pack || receiver.pack) throw new Error(game.i18n.localize("ETC.Hope.InvalidRecipient"));
  if (!giver.system.hopeDiceCount) throw new Error(game.i18n.format("ETC.Hope.NoneToGive", {name: giver.name}));
  // Only GM initiates transfer after establishing the narrative prerequisites.
  const previousGiven = giver.system.hope.givenAway;
  const previousReceived = giver.system.hope.received;
  const giverUpdate = giver.system.ownHopeDie
    ? {"system.hope.givenAway": true}
    : {"system.hope.received": Math.max(0, giver.system.hope.received - 1)};
  await giver.update(giverUpdate);
  try {
    await receiver.update({"system.hope.received": receiver.system.hope.received + 1});
  } catch (error) {
    // Restore the giver on a failed recipient update.
    await giver.update({"system.hope.givenAway": previousGiven, "system.hope.received": previousReceived}).catch(() => {});
    throw error;
  }
  return {giver, receiver};
  } finally {
    unlockPartyLifecycle("gm-hope-transfer");
  }
}
