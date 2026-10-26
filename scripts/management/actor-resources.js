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

import {
  notifyRequester
} from "../notifications.js";

import {
  tryLockPartyLifecycle,
  unlockPartyLifecycle
} from "./party-lock.js";

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
    momentStatus
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

  // Un Instant remis à zéro reprend son dé d'Espoir, comme depuis la fiche.
  await actor.update({
    "system.vice.available": Boolean(viceAvailable),
    "system.virtue.available": Boolean(virtueAvailable),
    "system.moment.status": normalizedMomentStatus,
    ...(normalizedMomentStatus === INSTANT_STATUSES.IDLE
      ? { "system.hope.givenAway": false }
      : {})
  });

  return actor;
}

/**
 * Martyre : un personnage qui meurt pour les autres peut donner son dé
 * d'Espoir à un autre survivant, qui le lance désormais en plus des siens.
 * Le donneur transmet d'abord le dé gagné par son propre Instant, sinon l'un
 * de ceux qu'il a lui-même reçus.
 */
export async function handleTransferHopeDie(
  requesterId,
  fromActorUuid,
  toActorUuid
) {
  const requester = game.users.get(requesterId);
  if (!requester) return false;

  // Comme la régie MJ, pas pendant un conflit : la résolution garde un
  // instantané des ressources du personnage.
  if (getCollectiveState().activeResolution) {
    notifyRequester(
      requesterId,
      "warn",
      game.i18n.localize("ETC.ActorManagement.ConflictBlocked")
    );
    return false;
  }

  const lifecycleOwner = "transfer-hope-die";

  if (!tryLockPartyLifecycle(lifecycleOwner)) {
    notifyRequester(
      requesterId,
      "warn",
      game.i18n.localize("ETC.Notifications.PartyActionBusy")
    );
    return false;
  }

  try {
    return await transferHopeDie(
      requester,
      fromActorUuid,
      toActorUuid
    );
  } finally {
    unlockPartyLifecycle(lifecycleOwner);
  }
}

async function transferHopeDie(
  requester,
  fromActorUuid,
  toActorUuid
) {
  const requesterId = requester.id;
  const giver = await getCharacterByUuid(fromActorUuid);
  const receiver = await getCharacterByUuid(toActorUuid);

  if (!giver || !receiver || giver === receiver) {
    notifyRequester(
      requesterId,
      "warn",
      game.i18n.localize("ETC.Hope.InvalidRecipient")
    );
    return false;
  }

  if (
    !requester.isGM &&
    !giver.testUserPermission(requester, "OWNER")
  ) {
    notifyRequester(
      requesterId,
      "warn",
      game.i18n.localize("ETC.Notifications.NotOwner")
    );
    return false;
  }

  if (giver.system.hopeDiceCount <= 0) {
    notifyRequester(
      requesterId,
      "warn",
      game.i18n.format("ETC.Hope.NoneToGive", {
        name: giver.name
      })
    );
    return false;
  }

  await giver.update(
    giver.system.ownHopeDie
      ? { "system.hope.givenAway": true }
      : {
          "system.hope.received":
            Math.max(giver.system.hope.received - 1, 0)
        }
  );

  await receiver.update({
    "system.hope.received":
      receiver.system.hope.received + 1
  });

  notifyRequester(
    requesterId,
    "info",
    game.i18n.format("ETC.Hope.Transferred", {
      from: giver.name,
      to: receiver.name
    })
  );

  return true;
}

async function getCharacterByUuid(actorUuid) {
  if (typeof actorUuid !== "string" || !actorUuid) return null;

  const actor = await fromUuid(actorUuid);

  // Seuls les personnages du monde, jamais ceux d'un compendium.
  return actor?.documentName === "Actor" &&
    actor.type === "character" &&
    !actor.pack
    ? actor
    : null;
}
