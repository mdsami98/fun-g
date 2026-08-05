import { useCallback, useEffect, useRef, useState } from 'react';
import { createGameSocket } from '../api/socket';

const INITIAL_STATE = {
  connected: false,
  phase: null,
  roundId: null,
  bettingClosesAt: null,
  startedAt: null,
  multiplier: '1.00',
  crashPoint: null,
  history: [],
  myBet: null,
  balance: null,
};

export function useGameSocket(accessToken) {
  const [state, setState] = useState(INITIAL_STATE);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = createGameSocket(accessToken);
    socketRef.current = socket;

    socket.on('connect', () => setState((s) => ({ ...s, connected: true })));
    socket.on('disconnect', () => setState((s) => ({ ...s, connected: false })));

    socket.on('game:snapshot', (snapshot) => {
      setState((s) => ({
        ...s,
        connected: true,
        phase: snapshot.round?.status ?? null,
        roundId: snapshot.round?.id ?? null,
        bettingClosesAt: snapshot.bettingClosesAt,
        startedAt: snapshot.startedAt,
        multiplier: snapshot.currentMultiplier,
        crashPoint: snapshot.round?.crashPoint ?? null,
        history: snapshot.history ?? [],
        myBet: snapshot.myBet,
        balance: snapshot.balance,
      }));
    });

    socket.on('game:betting_opened', ({ roundId, bettingClosesAt }) => {
      setState((s) => ({
        ...s,
        phase: 'betting',
        roundId,
        bettingClosesAt,
        startedAt: null,
        multiplier: '1.00',
        crashPoint: null,
        myBet: null,
      }));
    });

    socket.on('game:round_started', ({ roundId, startedAt }) => {
      setState((s) => (s.roundId === roundId ? { ...s, phase: 'running', startedAt } : s));
    });

    socket.on('game:tick', ({ roundId, multiplier }) => {
      setState((s) => (s.roundId === roundId ? { ...s, multiplier } : s));
    });

    socket.on('game:round_crashed', ({ roundId, crashPoint, crashedAt }) => {
      setState((s) => {
        if (s.roundId !== roundId) return s;
        const myBet =
          s.myBet && s.myBet.status === 'pending' ? { ...s.myBet, status: 'lost' } : s.myBet;
        return {
          ...s,
          phase: 'crashed',
          crashPoint,
          multiplier: crashPoint,
          myBet,
          history: [{ roundId, crashPoint, crashedAt }, ...s.history].slice(0, 20),
        };
      });
    });

    socket.on('game:balance_update', ({ balance }) => {
      setState((s) => ({ ...s, balance }));
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const placeBet = useCallback((amount) => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve({ ok: false, reason: 'NOT_CONNECTED' });
      socket.emit('placeBet', { amount }, (ack) => {
        if (ack?.ok) {
          setState((s) => ({ ...s, myBet: ack.bet, balance: ack.balance }));
        }
        resolve(ack);
      });
    });
  }, []);

  const cashOut = useCallback(() => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve({ ok: false, reason: 'NOT_CONNECTED' });
      socket.emit('cashOut', {}, (ack) => {
        if (ack?.ok) {
          setState((s) => ({
            ...s,
            myBet: s.myBet
              ? {
                  ...s.myBet,
                  status: 'cashed_out',
                  cashOutMultiplier: ack.cashOutMultiplier,
                  payout: ack.payout,
                }
              : s.myBet,
            balance: ack.balance,
          }));
        }
        resolve(ack);
      });
    });
  }, []);

  return { ...state, placeBet, cashOut };
}
