export type Suit = "Spades" | "Hearts" | "Diamonds" | "Clubs";

export interface Card {
  id: string;
  suit: Suit;
  rank: number; // 2 - 14, where 11=J, 12=Q, 13=K, 14=A
  label: string;
}

export interface PlayedCard {
  playerIndex: number;
  card: Card;
}

export interface TeamScore {
  score: number;
  bags: number;
}

export const SUITS: Suit[] = ["Spades", "Hearts", "Diamonds", "Clubs"];
export const RANKS: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const SUIT_SYMBOL: Record<Suit, string> = {
  Spades: "♠",
  Hearts: "♥",
  Diamonds: "♦",
  Clubs: "♣",
};

const RANK_LABEL: Record<number, string> = {
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const rankLabel = RANK_LABEL[rank] ?? String(rank);
      deck.push({
        id: `${rankLabel}${SUIT_SYMBOL[suit]}`,
        suit,
        rank,
        label: `${rankLabel}${SUIT_SYMBOL[suit]}`,
      });
    }
  }
  return deck;
}

export function shuffleDeck(
  deck: Card[],
  rng: () => number = Math.random,
): Card[] {
  const result = deck.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealHands(deck: Card[]): Card[][] {
  if (deck.length !== 52) {
    throw new Error("A standard deck must contain 52 cards");
  }
  const hands: Card[][] = [[], [], [], []];
  deck.forEach((card, index) => {
    hands[index % 4].push(card);
  });
  hands.forEach((hand) => sortHand(hand));
  return hands;
}

export function sortHand(hand: Card[]): Card[] {
  return hand.sort((a, b) => {
    if (a.suit === b.suit) {
      return b.rank - a.rank;
    }
    const suitPriority: Record<Suit, number> = {
      Spades: 4,
      Hearts: 3,
      Diamonds: 2,
      Clubs: 1,
    };
    return suitPriority[b.suit] - suitPriority[a.suit];
  });
}

export function getPlayableCards(
  hand: Card[],
  leadSuit: Suit | null,
  spadesBroken: boolean,
): Card[] {
  if (!leadSuit) {
    if (!spadesBroken) {
      const nonSpades = hand.filter((card) => card.suit !== "Spades");
      if (nonSpades.length > 0) {
        return nonSpades;
      }
    }
    return hand.slice();
  }

  const matchingSuit = hand.filter((card) => card.suit === leadSuit);
  return matchingSuit.length > 0 ? matchingSuit : hand.slice();
}

function cardStrength(card: Card, leadSuit: Suit): number {
  if (card.suit === "Spades") {
    return card.rank + 100;
  }
  if (card.suit === leadSuit) {
    return card.rank + 50;
  }
  return card.rank;
}

function compareCardsForTrick(
  cardA: Card,
  cardB: Card,
  leadSuit: Suit,
): number {
  return cardStrength(cardA, leadSuit) - cardStrength(cardB, leadSuit);
}

export function determineTrickWinner(
  trick: PlayedCard[],
  leadSuit: Suit,
): number {
  if (trick.length !== 4) {
    throw new Error("A trick must contain 4 cards");
  }
  let winningPlay = trick[0];
  for (let i = 1; i < trick.length; i += 1) {
    const play = trick[i];
    const comparison = compareCardsForTrick(
      play.card,
      winningPlay.card,
      leadSuit,
    );
    if (comparison > 0) {
      winningPlay = play;
    }
  }
  return winningPlay.playerIndex;
}

export function evaluateBid(hand: Card[]): number {
  let score = 0;
  for (const card of hand) {
    if (card.suit === "Spades") {
      if (card.rank >= 12) {
        score += 1.25;
      } else if (card.rank >= 10) {
        score += 0.75;
      } else {
        score += 0.4;
      }
    } else {
      if (card.rank === 14) {
        score += 1;
      } else if (card.rank === 13) {
        score += 0.6;
      } else if (card.rank === 12) {
        score += 0.4;
      } else if (card.rank === 11) {
        score += 0.2;
      }
    }
  }
  const bid = Math.max(1, Math.min(13, Math.round(score)));
  return bid;
}

function selectLowestWinningCard(
  options: Card[],
  trick: PlayedCard[],
  leadSuit: Suit | null,
): Card | null {
  if (!leadSuit) {
    return null;
  }
  const highestInTrick = trick.reduce((max, play) => {
    const strength = cardStrength(play.card, leadSuit);
    return strength > max ? strength : max;
  }, -Infinity);
  const candidate = options
    .filter((card) => cardStrength(card, leadSuit) > highestInTrick)
    .sort((a, b) => cardStrength(a, leadSuit) - cardStrength(b, leadSuit))[0];
  return candidate ?? null;
}

export function chooseAICard(
  hand: Card[],
  playable: Card[],
  trick: PlayedCard[],
  leadSuit: Suit | null,
  spadesBroken: boolean,
): Card {
  if (playable.length === 1) {
    return playable[0];
  }

  if (!leadSuit) {
    const nonSpades = playable.filter((card) => card.suit !== "Spades");
    if (nonSpades.length > 0) {
      return nonSpades[nonSpades.length - 1];
    }
    return playable[playable.length - 1];
  }

  const winningCandidate = selectLowestWinningCard(playable, trick, leadSuit);
  if (winningCandidate) {
    return winningCandidate;
  }

  const sameSuit = playable.filter((card) => card.suit === leadSuit);
  if (sameSuit.length > 0) {
    return sameSuit[sameSuit.length - 1];
  }

  const spades = playable.filter((card) => card.suit === "Spades");
  if (spades.length > 0) {
    return spades[0];
  }

  return playable[0];
}

export function getTeamIndex(playerIndex: number): 0 | 1 {
  return playerIndex % 2 === 0 ? 0 : 1;
}

export function scoreRound(
  bids: number[],
  tricksWon: number[],
  teams: [TeamScore, TeamScore],
): {
  updatedTeams: [TeamScore, TeamScore];
  roundScores: [number, number];
  bagsEarned: [number, number];
} {
  if (bids.length !== 4 || tricksWon.length !== 4) {
    throw new Error("Bids and tricks must be provided for all four players");
  }

  const cloneTeams: [TeamScore, TeamScore] = [{ ...teams[0] }, { ...teams[1] }];

  const teamBids: [number, number] = [0, 0];
  const teamTricks: [number, number] = [0, 0];

  bids.forEach((bid, index) => {
    const team = getTeamIndex(index);
    teamBids[team] += bid;
  });

  tricksWon.forEach((tricks, index) => {
    const team = getTeamIndex(index);
    teamTricks[team] += tricks;
  });

  const roundScores: [number, number] = [0, 0];
  const bagsEarned: [number, number] = [0, 0];

  (teamBids as number[]).forEach((bid, teamIndex) => {
    const tricks = teamTricks[teamIndex];
    if (tricks >= bid) {
      const bags = tricks - bid;
      const score = bid * 10 + bags;
      roundScores[teamIndex] = score;
      cloneTeams[teamIndex].score += score;
      cloneTeams[teamIndex].bags += bags;
      bagsEarned[teamIndex] = bags;
      if (cloneTeams[teamIndex].bags >= 10) {
        cloneTeams[teamIndex].score -= 100;
        cloneTeams[teamIndex].bags -= 10;
      }
    } else {
      const score = -bid * 10;
      roundScores[teamIndex] = score;
      cloneTeams[teamIndex].score += score;
    }
  });

  return {
    updatedTeams: cloneTeams,
    roundScores,
    bagsEarned,
  };
}

export function formatCardLabel(card: Card): string {
  return card.label;
}

export function hasCardsRemaining(playersHands: Card[][]): boolean {
  return playersHands.some((hand) => hand.length > 0);
}
