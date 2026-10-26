# Changelog — Ten Candles – Game Assistant

## Non publié — Dés d’Espoir transmissibles

- Un personnage peut lancer plusieurs dés d’Espoir : le sien et ceux qu’un martyr lui a transmis (règle « Martyrdom » du livre de base).
- Nouveau champ d’Actor `system.hope` (`received`, `givenAway`) et accesseurs `ownHopeDie` et `hopeDiceCount` ; `hopeDieAvailable` reste disponible.
- Nouvelle action `transfer-hope-die` et API `game.evilTenCandles.transferHopeDie(fromActorUuid, toActorUuid)`, réservée au MJ ou au propriétaire du donneur.
- Les résolutions enregistrent tous les dés d’Espoir dans `hopeResults` ; les anciennes résolutions (un seul `momentResult`) restent lues comme avant.
- Traductions ajoutées aux six langues existantes.

## 1.0.1 — À propos et soutien facultatif

- Ajout d’une entrée « À propos de Ten Candles – Game Assistant » dans l’onglet Paramètres de Foundry VTT.
- Ajout d’une fenêtre présentant le système, sa version installée, le crédit Evilbram et le dépôt GitHub.
- Traductions ajoutées aux six langues existantes.
- Aucune modification des règles ou mécaniques de jeu.

## 1.0.0 — Version initiale

- Première version de production du système.
