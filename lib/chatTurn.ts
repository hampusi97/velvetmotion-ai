/**
 * Synchronous turn lock shared by companion chat, dual chat, and group chat.
 * A second submit while a turn is open is ignored. Switching conversations
 * invalidates the in-flight turn so its reply cannot land in the new thread,
 * and thinking is cleared on success, error, timeout, and abort.
 */

export type ChatTurnOutcome = "success" | "error" | "timeout" | "abort";

export type ChatTurnSnapshot = {
  thinking: boolean;
  locked: boolean;
  generation: number;
  conversationId: string;
  lastOutcome: ChatTurnOutcome | null;
};

export function createChatTurnGuard(conversationId: string) {
  let state: ChatTurnSnapshot = {
    thinking: false,
    locked: false,
    generation: 0,
    conversationId,
    lastOutcome: null,
  };

  return {
    snapshot(): ChatTurnSnapshot {
      return { ...state };
    },
    /** Returns the turn generation, or null when a send is already in flight. */
    tryStart(): number | null {
      if (state.locked) return null;
      state = {
        ...state,
        locked: true,
        thinking: true,
        generation: state.generation + 1,
        lastOutcome: null,
      };
      return state.generation;
    },
    clearThinking(generation: number): boolean {
      if (generation !== state.generation) return false;
      state = { ...state, thinking: false };
      return true;
    },
    settle(generation: number, outcome: ChatTurnOutcome): boolean {
      if (generation !== state.generation) return false;
      state = { ...state, locked: false, thinking: false, lastOutcome: outcome };
      return true;
    },
    switchConversation(nextConversationId: string): void {
      state = {
        thinking: false,
        locked: false,
        generation: state.generation + 1,
        conversationId: nextConversationId,
        lastOutcome: "abort",
      };
    },
    isCurrent(generation: number, conversationId: string): boolean {
      return state.generation === generation && state.conversationId === conversationId;
    },
  };
}

export type ChatTurnGuard = ReturnType<typeof createChatTurnGuard>;

/** View updates apply only to the conversation that started the turn. */
export function shouldCommitTurnToActiveView(args: {
  activeConversationId: string;
  originConversationId: string;
  generation: number;
  currentGeneration: number;
}): boolean {
  return (
    args.activeConversationId === args.originConversationId &&
    args.generation === args.currentGeneration
  );
}
