import { strict as assert } from "node:assert";
import {
  Card,
  PlayedCard,
  createDeck,
  dealHands,
  determineTrickWinner,
  getPlayableCards,
  scoreRound,
  shuffleDeck,
} from "../gameLogic.js";

function testCreateDeck() {
  const deck = shuffleDeck(createDeck(), () => 0.5);
  assert.equal(deck.length, 52, "deck should contain 52 cards");
  const ids = new Set(deck.map((card) => card.id));
  assert.equal(ids.size, 52, "deck should contain unique cards");
}

function testDealHands() {
  const deck = createDeck();
  const hands = dealHands(deck);
  assert.equal(hands.length, 4, "should create four hands");
  hands.forEach((hand, index) => {
    assert.equal(hand.length, 13, `hand ${index} should have 13 cards`);
  });
}

function testPlayableCards() {
  const hand: Card[] = [
    { id: "2♠", suit: "Spades", rank: 2, label: "2♠" },
    { id: "10♥", suit: "Hearts", rank: 10, label: "10♥" },
    { id: "A♥", suit: "Hearts", rank: 14, label: "A♥" },
  ];
  const playable = getPlayableCards(hand, "Hearts", false);
  assert.deepEqual(
    playable.map((card) => card.id),
    ["10♥", "A♥"],
    "must follow lead suit when available",
  );
}

function testDetermineWinner() {
  const trick: PlayedCard[] = [
    {
      playerIndex: 0,
      card: { id: "Q♥", suit: "Hearts", rank: 12, label: "Q♥" },
    },
    {
      playerIndex: 1,
      card: { id: "A♥", suit: "Hearts", rank: 14, label: "A♥" },
    },
    {
      playerIndex: 2,
      card: { id: "3♠", suit: "Spades", rank: 3, label: "3♠" },
    },
    {
      playerIndex: 3,
      card: { id: "K♥", suit: "Hearts", rank: 13, label: "K♥" },
    },
  ];
  const winner = determineTrickWinner(trick, "Hearts");
  assert.equal(winner, 2, "spades should trump other suits");
}

function testScoreRound() {
  const bids = [4, 4, 3, 3];
  const tricks = [5, 2, 4, 2];
  const result = scoreRound(bids, tricks, [
    { score: 90, bags: 8 },
    { score: 60, bags: 7 },
  ]);
  assert.deepEqual(
    result.roundScores,
    [72, -70],
    "round scores should include bags and penalties",
  );
  assert.deepEqual(result.updatedTeams[0], { score: 62, bags: 0 });
  assert.deepEqual(result.updatedTeams[1], { score: -10, bags: 7 });
  assert.deepEqual(result.bagsEarned, [2, 0]);
}

export function runAllTests() {
  testCreateDeck();
  testDealHands();
  testPlayableCards();
  testDetermineWinner();
  testScoreRound();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
