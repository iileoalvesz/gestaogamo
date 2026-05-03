import { useState, useEffect, useCallback, useRef } from "react";
import { getEquipmentList } from "../api/equipment";
import type { Equipment } from "../types";

export interface NotifItem {
  id: number;
  name: string;
  location: string;
  days: number | null;
  status: "vencido" | "a_vencer";
}

function playChime(urgent: boolean) {
  try {
    type AudioCtxCtor = typeof AudioContext;
    const Ctor: AudioCtxCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: AudioCtxCtor }).webkitAudioContext;
    const ctx = new Ctor();

    if (urgent) {
      // Triple beep for overdue
      [0, 0.22, 0.44].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.value = 880;
        const t = ctx.currentTime + offset;
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.18);
      });
    } else {
      // Pleasant chime (C5 → E5 → G5) for expiring soon
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    }
  } catch {
    // AudioContext unavailable or blocked by browser policy
  }
}

const POLL_MS = 5 * 60 * 1000; // 5 minutes

export function useNotifications() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCount = useRef<number>(-1); // -1 = not yet initialized

  const fetchNotifications = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        getEquipmentList({ status: "vencido",   page_size: "100" }),
        getEquipmentList({ status: "a_vencer",  page_size: "100" }),
      ]);

      const vencidos: NotifItem[] = r1.data.results.map((e: Equipment) => ({
        id: e.id,
        name: e.name,
        location: e.location,
        days: e.days_until_expiration,
        status: "vencido",
      }));

      const aVencer: NotifItem[] = r2.data.results.map((e: Equipment) => ({
        id: e.id,
        name: e.name,
        location: e.location,
        days: e.days_until_expiration,
        status: "a_vencer",
      }));

      const combined = [...vencidos, ...aVencer];
      const newCount = combined.length;
      const prev = prevCount.current;

      if (prev === -1) {
        // First fetch — sound plays only if user later opens the panel
        // (autoplay policy: can't play on page load without prior interaction)
      } else if (newCount > prev) {
        // New items appeared since last poll — user is active on the page
        playChime(vencidos.length > 0);
      }

      prevCount.current = newCount;
      setItems(combined);
    } catch {
      /* silent fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Small delay so auth context is settled before the first call
    const init = setTimeout(() => fetchNotifications(), 1500);
    const poll = setInterval(fetchNotifications, POLL_MS);
    return () => {
      clearTimeout(init);
      clearInterval(poll);
    };
  }, [fetchNotifications]);

  return { items, loading, playChime, fetchNotifications };
}
