"use client";

import { useEffect, useRef } from "react";
import type { Character } from "@/lib/characters";
import { delayedNudeMessage, shouldDropDelayedNude, aftercareMessage } from "@/lib/chatExtras";
import { addToGallery } from "@/lib/storage";

/** Drop into chat parents — delayed nude after high intimacy. */
export function useDelayedLingerieDrop(
  character: Character,
  intimacy: number,
  messageCount: number,
  append: (msg: { role: "assistant"; content: string; imageUrl?: string; mediaType?: string }) => void,
) {
  const dropped = useRef(false);
  useEffect(() => {
    if (!shouldDropDelayedNude(intimacy, messageCount, dropped.current)) return;
    const t = setTimeout(() => {
      if (dropped.current) return;
      dropped.current = true;
      const msg = delayedNudeMessage(character);
      append(msg);
      addToGallery({
        characterId: character.id,
        characterName: character.name,
        type: "lingerie",
        url: msg.imageUrl!,
        prompt: "delayed intimacy drop",
      });
    }, 12000);
    return () => clearTimeout(t);
  }, [character, intimacy, messageCount, append]);
}

export function buildAftercare(character: Character) {
  return aftercareMessage(character);
}
