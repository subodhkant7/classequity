'use client';
import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
// Native controls must not appear ready before React can handle their first event.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
