"use client";

import { useCallback, useSyncExternalStore } from "react";
import { addCoins, getCoins, spendCoins as spendStorageCoins } from "./storage";
import { saveSettingDB } from "./db";

const EVENT_NAME = "vm:coins-changed";
const START_COINS = 120;

function readCoinsSnapshot(): number {
  if (typeof window === "undefined") return START_COINS;
  return getCoins();
}

function subscribeCoins(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}

export function emitCoinsChanged(nextBalance?: number) {
  if (typeof window === "undefined") return;
  if (typeof nextBalance === "number") {
    void saveSettingDB("coins", nextBalance);
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function earnCoins(amount: number): number {
  const next = addCoins(amount);
  emitCoinsChanged(next);
  return next;
}

export function spendCoinsSynced(amount: number): { ok: boolean; balance: number } {
  const ok = spendStorageCoins(amount);
  const balance = getCoins();
  emitCoinsChanged(balance);
  return { ok, balance };
}

export function useCoinsStore() {
  const coins = useSyncExternalStore(subscribeCoins, readCoinsSnapshot, () => START_COINS);

  const earn = useCallback((amount: number) => earnCoins(amount), []);
  const spend = useCallback((amount: number) => spendCoinsSynced(amount), []);
  const refresh = useCallback(() => emitCoinsChanged(getCoins()), []);

  return { coins, earn, spend, refresh };
}
