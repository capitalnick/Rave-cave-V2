/**
 * Rémy's Rotating Greetings
 * Each greeting introduces what Rémy can help with.
 * The system picks randomly on each app open, avoiding repeats within a session.
 */

const GREETINGS_POOL = [
  `Ah, bienvenue! I'm Rémy, your personal sommelier. I can help you find the perfect pairing for tonight's dinner, answer questions about grapes and regions, search your cellar for hidden gems, or add new bottles by snapping a photo of the label. What shall we explore?`,

  `Bonsoir! Rémy at your service. Whether you're hunting for something under thirty dollars, curious about Burgundy versus Bordeaux, or want to photograph a wine list for my recommendation — I'm here to help. What's on your mind?`,

  `Welcome back to the Cave! I'm Rémy, and I know your cellar inside and out. Ask me for food pairings, quiz me on varietals, search for your best bottles, or show me a label to add to the collection. How may I assist you today?`,

  `Ah, splendid to see you! I'm Rémy — part sommelier, part cellar keeper. I can suggest what to drink tonight, explain the difference between Syrah and Shiraz, find your cheapest crowd-pleasers, or help you catalogue new arrivals from a photo. Where shall we begin?`,

  `Bonjour! Rémy here, ready to serve. Need a wine for lamb? Curious about natural wines? Looking for your highest-rated bottle? Just snap a menu and I'll recommend something. Your cellar and my knowledge — a perfect pairing. What can I do for you?`,

  `Welcome to Rave Cave! I'm Rémy, your AI sommelier with a French accent and a passion for great wine. I can pair wines with your meal, dive deep into terroir, search your collection by any criteria, or read a wine label to add it to your cellar. Fire away!`,

  `Ah, enchantée! I'm Rémy. Think of me as your personal wine concierge. Food pairings? Done. Grape geekery? Love it. Finding the best value in your cellar? My specialty. Photographing a restaurant wine list for advice? Absolutely. What shall we do?`,

  `Bonsoir and welcome! Rémy reporting for duty. I can recommend bottles from your collection, explain why Riesling pairs brilliantly with spicy food, or extract details from a label photo to build your inventory. What's calling to you tonight?`,

  `Ah, you're back! I'm Rémy, and I've been keeping an eye on your cellar. Need suggestions for what's drinking beautifully right now? Curious about a region? Want me to analyse a wine list photo? Just say the word.`,

  `Welcome, wine lover! I'm Rémy — sommelier, educator, and cellar assistant all in one. Ask me anything: pairings, grape varieties, tasting notes, what to open for a special occasion, or show me a photo and I'll do the rest. How can I help?`,

  `Bonjour! Rémy here, at your service. I can tell you which of your bottles to drink now versus hold, recommend pairings for any dish, answer obscure wine trivia, or help you add new bottles by photographing the label. What would you like?`,

  `Ah, magnifique — you've arrived! I'm Rémy. Whether it's finding your best Shiraz, explaining malolactic fermentation, picking something festive under fifty dollars, or scanning a restaurant's wine list — I'm ready. What's the occasion?`,
];

let usedIndices: Set<number> = new Set();

/**
 * Returns a random greeting, avoiding repeats within the session.
 * Resets the pool if all greetings have been used.
 */
export function getRandomGreeting(): string {
  // Reset if we've used all greetings
  if (usedIndices.size >= GREETINGS_POOL.length) {
    usedIndices.clear();
  }

  // Find an unused index
  let index: number;
  do {
    index = Math.floor(Math.random() * GREETINGS_POOL.length);
  } while (usedIndices.has(index));

  usedIndices.add(index);
  return GREETINGS_POOL[index];
}

/**
 * Reset the used greetings tracker (call on app unmount if needed)
 */
export function resetGreetings(): void {
  usedIndices.clear();
}

export { GREETINGS_POOL };
