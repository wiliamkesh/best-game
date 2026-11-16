// The upgrade system: three families, three ranks each, drafted between
// levels. After levels 2, 4 and 6 the run pauses and offers one card per
// family (the next rank you do not own yet); you pick one and it stays for
// the rest of the run. The families pull in genuinely different directions:
// Gravity Mastery builds huge constellations, Heartward survives the
// meteors, Stellar Reservoir spends energy freely. A build is a choice,
// not a checklist.
//
// The modifiers live here so the world reads them from one place:
// getActiveModifiers(owned) returns the numbers the simulation uses.

export const UPGRADE_FAMILIES = ['gravity', 'heartward', 'reservoir'];

export const UPGRADE_DEFINITIONS = {
  gravity: [
    { id: 'gravity-1', name: 'STRONG PULL', desc: 'Stars fall toward wells 25% harder', icon: '◎' },
    { id: 'gravity-2', name: 'WIDE WELL', desc: 'Wells pull from 25 farther away', icon: '◉' },
    { id: 'gravity-3', name: 'STEADY ORBIT', desc: 'Orbiting stars hold 30% longer', icon: '✦' },
  ],
  heartward: [
    { id: 'heartward-1', name: 'HEART SHIELD', desc: 'The Heart Star absorbs one hit', icon: '♥' },
    { id: 'heartward-2', name: 'SHIELD RENEWAL', desc: 'The shield returns 20s after breaking', icon: '♡' },
    { id: 'heartward-3', name: 'LAST DEFLECTION', desc: 'Once a level, a meteor is turned away', icon: '✧' },
  ],
  reservoir: [
    { id: 'reservoir-1', name: 'QUICK SPRING', desc: 'Energy returns 3 per second faster', icon: '⚡' },
    { id: 'reservoir-2', name: 'DEEP WELL', desc: 'Energy capacity grows by 50', icon: '◆' },
    { id: 'reservoir-3', name: 'BIG BLAST', desc: 'Detonations clear 60 farther out', icon: '✺' },
  ],
};

/** The ranks you own: { gravity: 0..3, heartward: 0..3, reservoir: 0..3 }. */
export function emptyOwned() {
  return { gravity: 0, heartward: 0, reservoir: 0 };
}

/** The draft: one card per family that still has a rank left, in family
 * order. After level 6 every family is at most rank 2, so a draft is
 * always three cards until the run ends. */
export function generateUpgradeDraft(owned) {
  const cards = [];
  for (const family of UPGRADE_FAMILIES) {
    const rank = owned[family];
    const defs = UPGRADE_DEFINITIONS[family];
    if (rank < defs.length) cards.push({ family, rank: rank + 1, ...defs[rank] });
  }
  return cards;
}

/** Apply a drafted card: the family's rank rises by one. */
export function applyUpgrade(owned, card) {
  owned[card.family] = Math.min(3, owned[card.family] + 1);
  return owned;
}

/** The numbers the simulation reads, derived from the ranks owned. */
export function getActiveModifiers(owned) {
  return {
    // Gravity Mastery
    pullMult: owned.gravity >= 1 ? 1.25 : 1,
    pullRadiusBonus: owned.gravity >= 2 ? 25 : 0,
    orbitHoldMult: owned.gravity >= 3 ? 1.3 : 1,
    // Heartward
    shieldMax: owned.heartward >= 1 ? 1 : 0,
    shieldRecharge: owned.heartward >= 2 ? 20 : 0,
    deflectPerLevel: owned.heartward >= 3 ? 1 : 0,
    // Stellar Reservoir
    regenBonus: owned.reservoir >= 1 ? 3 : 0,
    energyMaxBonus: owned.reservoir >= 2 ? 50 : 0,
    detonateBonus: owned.reservoir >= 3 ? 60 : 0,
  };
}
