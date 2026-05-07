import {
  Card,
  PlayedCard,
  Suit,
  TeamScore,
  chooseAICard,
  createDeck,
  dealHands,
  determineTrickWinner,
  evaluateBid,
  formatCardLabel,
  getPlayableCards,
  scoreRound,
  shuffleDeck,
} from "./gameLogic";

type Phase = "bidding" | "playing" | "round-summary";

interface PlayerState {
  id: number;
  name: string;
  team: 0 | 1;
  isUser: boolean;
  hand: Card[];
  bid: number | null;
  tricksWon: number;
}

interface RoundSummary {
  roundNumber: number;
  bids: number[];
  tricks: number[];
  roundScores: [number, number];
  totals: [number, number];
  bagsEarned: [number, number];
}

interface GameState {
  players: PlayerState[];
  teams: [TeamScore, TeamScore];
  phase: Phase;
  currentPlayer: number;
  roundNumber: number;
  dealerIndex: number;
  roundLeader: number;
  leadSuit: Suit | null;
  trick: PlayedCard[];
  spadesBroken: boolean;
  userBid: number;
  roundSummary: RoundSummary | null;
  aiTimer: number | null;
}

const PLAYER_NAMES = ["You", "AI North", "AI East", "AI West"];

const state: GameState = {
  players: [],
  teams: [
    { score: 0, bags: 0 },
    { score: 0, bags: 0 },
  ],
  phase: "bidding",
  currentPlayer: 0,
  roundNumber: 1,
  dealerIndex: 3,
  roundLeader: 0,
  leadSuit: null,
  trick: [],
  spadesBroken: false,
  userBid: 1,
  roundSummary: null,
  aiTimer: null,
};

function clearAiTimer() {
  if (state.aiTimer !== null) {
    window.clearTimeout(state.aiTimer);
    state.aiTimer = null;
  }
}

function createPlayers(): PlayerState[] {
  const deck = shuffleDeck(createDeck());
  const hands = dealHands(deck);
  return hands.map((hand, index) => ({
    id: index,
    name: PLAYER_NAMES[index],
    team: (index % 2 === 0 ? 0 : 1) as 0 | 1,
    isUser: index === 0,
    hand,
    bid: null,
    tricksWon: 0,
  }));
}

function startRound(dealer: number) {
  clearAiTimer();
  state.players = createPlayers();
  state.phase = "bidding";
  state.dealerIndex = dealer;
  state.roundLeader = (dealer + 1) % 4;
  state.currentPlayer = state.roundLeader;
  state.leadSuit = null;
  state.trick = [];
  state.spadesBroken = false;
  state.userBid = Math.max(1, evaluateBid(state.players[0].hand));
  state.roundSummary = null;
  render();
  scheduleAIAction();
}

function commitBid(bid: number) {
  if (state.phase !== "bidding") {
    return;
  }
  const current = state.players[state.currentPlayer];
  if (!current) {
    return;
  }
  current.bid = bid;
  const allBidsPlaced = state.players.every((player) => player.bid !== null);
  if (allBidsPlaced) {
    state.phase = "playing";
    state.currentPlayer = state.roundLeader;
    state.leadSuit = null;
    state.trick = [];
  } else {
    state.currentPlayer = (state.currentPlayer + 1) % 4;
    if (state.currentPlayer === 0) {
      state.userBid = Math.max(1, evaluateBid(state.players[0].hand));
    }
  }
  render();
  scheduleAIAction();
}

function handleCardPlay(playerIndex: number, card: Card) {
  if (state.phase !== "playing") {
    return;
  }
  if (state.currentPlayer !== playerIndex) {
    return;
  }
  const player = state.players[playerIndex];
  const playableIds = new Set(
    getPlayableCards(player.hand, state.leadSuit, state.spadesBroken).map(
      (item) => item.id,
    ),
  );
  if (!playableIds.has(card.id)) {
    return;
  }
  player.hand = player.hand.filter((item) => item.id !== card.id);
  const nextTrick = [...state.trick, { playerIndex, card }];
  state.trick = nextTrick;
  if (!state.leadSuit) {
    state.leadSuit = card.suit;
  }
  if (card.suit === "Spades") {
    state.spadesBroken = true;
  }

  if (nextTrick.length === 4) {
    const leadSuit = state.leadSuit ?? card.suit;
    const winner = determineTrickWinner(nextTrick, leadSuit);
    state.players[winner].tricksWon += 1;
    state.trick = [];
    state.leadSuit = null;
    state.currentPlayer = winner;
    render();
    if (state.players.every((p) => p.hand.length === 0)) {
      concludeRound();
    } else {
      scheduleAIAction();
    }
  } else {
    state.currentPlayer = (playerIndex + 1) % 4;
    render();
    scheduleAIAction();
  }
}

function concludeRound() {
  const bids = state.players.map((player) => player.bid ?? 0);
  const tricks = state.players.map((player) => player.tricksWon);
  const summaryRoundNumber = state.roundNumber;
  const scoring = scoreRound(bids, tricks, state.teams);
  state.teams = scoring.updatedTeams;
  state.roundSummary = {
    roundNumber: summaryRoundNumber,
    bids,
    tricks,
    roundScores: scoring.roundScores,
    totals: [scoring.updatedTeams[0].score, scoring.updatedTeams[1].score],
    bagsEarned: scoring.bagsEarned,
  };
  state.roundNumber += 1;
  state.phase = "round-summary";
  render();
}

function formatTeamName(team: 0 | 1): string {
  return team === 0 ? "North/South" : "East/West";
}

function render() {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }
  const playableUserCards = new Set<string>();
  if (state.phase === "playing" && state.currentPlayer === 0) {
    const user = state.players[0];
    getPlayableCards(user.hand, state.leadSuit, state.spadesBroken).forEach(
      (card) => playableUserCards.add(card.id),
    );
  }

  const playersHtml = state.players
    .map((player) => {
      const isActive =
        state.currentPlayer === player.id && state.phase !== "round-summary";
      const handHtml =
        player.isUser && state.phase === "playing"
          ? `<div class="player__hand">${player.hand
              .map((card) => {
                const playable = playableUserCards.has(card.id);
                const disabledClass = playable
                  ? "card--playable"
                  : "card--disabled";
                return `<button type="button" class="card ${disabledClass}" data-card="${card.id}" data-player="${player.id}" ${
                  playable ? "" : "disabled"
                }>${formatCardLabel(card)}</button>`;
              })
              .join("")}</div>`
          : "";

      const biddingControls =
        player.isUser &&
        state.phase === "bidding" &&
        state.currentPlayer === player.id
          ? `<div class="bid-control">
                <label for="bid-range">Select your bid</label>
                <input id="bid-range" type="range" min="1" max="13" value="${state.userBid}" />
                <div class="bid-control__value">Bid: <span id="bid-value">${state.userBid}</span></div>
                <button type="button" class="primary" id="lock-bid">Lock Bid</button>
             </div>`
          : "";

      return `<div class="player ${isActive ? "player--active" : ""}">
        <div class="player__heading">
          <h3>${player.name}</h3>
          <span class="player__team player__team--${player.team}">${formatTeamName(player.team)}</span>
        </div>
        <dl class="player__stats">
          <div><dt>Bid</dt><dd>${player.bid ?? "—"}</dd></div>
          <div><dt>Tricks</dt><dd>${player.tricksWon}</dd></div>
        </dl>
        ${handHtml}
        ${biddingControls}
      </div>`;
    })
    .join("");

  const trickHtml =
    state.trick.length === 0
      ? "<p>No cards played yet.</p>"
      : state.trick
          .map((play) => {
            const player = state.players[play.playerIndex];
            return `<div class="trick__card">
              <p class="trick__player">${player?.name ?? "Player"}</p>
              <div class="card card--played"><span>${formatCardLabel(play.card)}</span></div>
            </div>`;
          })
          .join("");

  const summaryHtml = state.roundSummary
    ? `<section class="summary">
        <h2>Round ${state.roundSummary.roundNumber} Summary</h2>
        <div class="summary__teams">
          ${[0, 1]
            .map((team) => {
              return `<div class="summary__team">
                <h3>${formatTeamName(team as 0 | 1)}</h3>
                <p>Round Score: ${state.roundSummary!.roundScores[team]}</p>
                <p>Bags this round: ${state.roundSummary!.bagsEarned[team]}</p>
                <p>Total Score: ${state.roundSummary!.totals[team]}</p>
              </div>`;
            })
            .join("")}
        </div>
        <table class="summary__table">
          <thead>
            <tr><th>Player</th><th>Bid</th><th>Tricks</th></tr>
          </thead>
          <tbody>
            ${state.players
              .map(
                (player) =>
                  `<tr><td>${player.name}</td><td>${state.roundSummary!.bids[player.id]}</td><td>${state.roundSummary!.tricks[player.id]}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <button type="button" class="primary" id="next-round">Start Round ${
          state.roundSummary.roundNumber + 1
        }</button>
      </section>`
    : "";

  const statusMessage =
    state.phase === "bidding"
      ? `Bidding — ${state.players[state.currentPlayer]?.name ?? ""}`
      : state.phase === "playing"
        ? `Trick in play — ${state.players[state.currentPlayer]?.name ?? ""} to act`
        : "Round complete";

  root.innerHTML = `
    <div class="app">
      <header class="app__header">
        <h1>AI Spades</h1>
        <div class="scoreboard">
          <div class="scoreboard__team">
            <h2>${formatTeamName(0)}</h2>
            <p class="scoreboard__score">${state.teams[0].score}</p>
            <p class="scoreboard__meta">Bags: ${state.teams[0].bags}</p>
          </div>
          <div class="scoreboard__team">
            <h2>${formatTeamName(1)}</h2>
            <p class="scoreboard__score">${state.teams[1].score}</p>
            <p class="scoreboard__meta">Bags: ${state.teams[1].bags}</p>
          </div>
        </div>
        <p class="app__status">${statusMessage}</p>
      </header>
      <section class="players">${playersHtml}</section>
      <section class="trick">
        <h2>Current Trick</h2>
        <div class="trick__cards">${trickHtml}</div>
      </section>
      ${summaryHtml}
    </div>
  `;

  attachEventHandlers(playableUserCards);
}

function attachEventHandlers(playableUserCards: Set<string>) {
  if (state.phase === "bidding" && state.currentPlayer === 0) {
    const bidInput = document.getElementById(
      "bid-range",
    ) as HTMLInputElement | null;
    const bidValue = document.getElementById("bid-value");
    const lockButton = document.getElementById("lock-bid");
    if (bidInput && bidValue) {
      bidInput.addEventListener("input", (event) => {
        const target = event.target as HTMLInputElement;
        state.userBid = Number(target.value);
        bidValue.textContent = String(state.userBid);
      });
    }
    if (lockButton) {
      lockButton.addEventListener("click", () => commitBid(state.userBid));
    }
  }

  if (state.phase === "playing" && state.currentPlayer === 0) {
    document
      .querySelectorAll<HTMLButtonElement>("button[data-card]")
      .forEach((button) => {
        const cardId = button.dataset.card;
        if (!cardId || !playableUserCards.has(cardId)) {
          return;
        }
        button.addEventListener("click", () => {
          const card = state.players[0].hand.find((item) => item.id === cardId);
          if (card) {
            handleCardPlay(0, card);
          }
        });
      });
  }

  if (state.roundSummary) {
    const nextButton = document.getElementById("next-round");
    if (nextButton) {
      nextButton.addEventListener("click", () => {
        const nextDealer = (state.dealerIndex + 1) % 4;
        startRound(nextDealer);
      });
    }
  }
}

function scheduleAIAction() {
  clearAiTimer();
  if (state.phase === "bidding") {
    const current = state.players[state.currentPlayer];
    if (!current || current.isUser) {
      return;
    }
    state.aiTimer = window.setTimeout(() => {
      const bid = evaluateBid(current.hand);
      commitBid(bid);
    }, 600);
  } else if (state.phase === "playing") {
    const current = state.players[state.currentPlayer];
    if (!current || current.isUser) {
      return;
    }
    state.aiTimer = window.setTimeout(() => {
      const playable = getPlayableCards(
        current.hand,
        state.leadSuit,
        state.spadesBroken,
      );
      const card = chooseAICard(
        current.hand,
        playable,
        state.trick,
        state.leadSuit,
        state.spadesBroken,
      );
      handleCardPlay(current.id, card);
    }, 650);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  startRound(state.dealerIndex);
});
