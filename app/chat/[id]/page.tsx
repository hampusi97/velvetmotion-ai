import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatScreen } from "@/components/chat-screen";
import { characters, getCharacter } from "@/lib/characters";

export const dynamicParams = false;

export function generateStaticParams() {
  return characters.map((character) => ({ id: character.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const character = getCharacter(id);
  if (!character) return { title: "Character" };
  return {
    title: character.name,
    description: `${character.name} is a fictional adult of ${character.age}. ${character.tagline}`,
  };
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const character = getCharacter(id);
  if (!character) notFound();
  return <ChatScreen key={character.id} characterId={character.id} />;
}
