'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generate,
  refine,
  getGeneration,
  generateSeries,
  subscribeToGenerationEvents
} from '../api/queries';
import type {
  AiGeneration,
  GenerationEvent,
  GeneratePayload,
  RefinePayload,
  SeriesGeneratePayload
} from '../api/types';

const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 180_000;
const SSE_MAX_RECONNECT_DELAY = 30_000;
const SSE_BASE_RECONNECT_DELAY = 1000;

function pollGeneration(id: string, signal: AbortSignal): Promise<AiGeneration> {
  const start = Date.now();
  return new Promise<AiGeneration>((resolve, reject) => {
    const tick = async () => {
      if (signal.aborted) {
        reject(new Error('aborted'));
        return;
      }
      try {
        const gen = await getGeneration(id);
        if (gen.status === 'completed' || gen.status === 'failed') {
          resolve(gen);
          return;
        }
        if (Date.now() - start > POLL_TIMEOUT) {
          reject(new Error('生成超时，请稍后在历史中查看'));
          return;
        }
        setTimeout(tick, POLL_INTERVAL);
      } catch (err) {
        reject(err);
      }
    };
    setTimeout(tick, POLL_INTERVAL);
  });
}

export interface UseGenerationResult {
  isGenerating: boolean;
  progress: number;
  progressMessage: string | null;
  generateImages: (payload: GeneratePayload) => Promise<AiGeneration>;
  refineImages: (payload: RefinePayload) => Promise<AiGeneration>;
  generateSeriesImages: (payload: SeriesGeneratePayload) => Promise<AiGeneration>;
  cancel: () => void;
}

export function useGeneration(): UseGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const cleanupSSE = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    reconnectAttemptRef.current = 0;
  }, []);

  const cancel = useCallback(() => {
    cleanupSSE();
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setProgress(0);
    setProgressMessage(null);
  }, [cleanupSSE]);

  useEffect(() => {
    return () => {
      cleanupSSE();
    };
  }, [cleanupSSE]);

  const subscribeWithReconnect = useCallback(
    (
      conversationId: string,
      onEvent: (event: GenerationEvent) => void,
      signal: AbortSignal
    ) => {
      cleanupSSE();

      const connect = () => {
        if (signal.aborted) return;

        const es = subscribeToGenerationEvents(
          conversationId,
          (event) => {
            reconnectAttemptRef.current = 0;
            onEvent(event);
          },
          () => {
            // SSE connection closed or errored
            if (signal.aborted) return;

            const attempt = reconnectAttemptRef.current;
            const delay = Math.min(
              SSE_BASE_RECONNECT_DELAY * Math.pow(2, attempt),
              SSE_MAX_RECONNECT_DELAY
            );
            reconnectAttemptRef.current = attempt + 1;

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          }
        );

        eventSourceRef.current = es;
      };

      connect();
    },
    [cleanupSSE]
  );

  const run = useCallback(
    async (starter: () => Promise<AiGeneration>): Promise<AiGeneration> => {
      setIsGenerating(true);
      setProgress(0);
      setProgressMessage(null);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const created = await starter();

        if (created.status === 'completed' || created.status === 'failed') {
          setProgress(created.status === 'completed' ? 100 : 0);
          return created;
        }

        // SSE-driven completion: create a promise that resolves when SSE
        // receives a terminal event ('completed' or 'failed').
        const ssePromise = new Promise<AiGeneration>((resolve, reject) => {
          if (!created.conversationId) {
            // No conversationId available — skip SSE, rely on polling fallback
            return;
          }
          subscribeWithReconnect(
            created.conversationId,
            (event) => {
              if (event.type === 'progress' && typeof event.progress === 'number') {
                setProgress(event.progress);
                setProgressMessage(event.message ?? null);
              } else if (event.type === 'completed') {
                setProgress(100);
                setProgressMessage(null);
                // Fetch the full generation object to return
                getGeneration(created.id).then(resolve, reject);
              } else if (event.type === 'failed') {
                setProgress(0);
                setProgressMessage(event.message ?? null);
                // Fetch the full generation object to return with error details
                getGeneration(created.id).then(resolve, reject);
              } else if (event.type === 'started') {
                setProgressMessage(event.message ?? null);
              }
            },
            controller.signal
          );

          // If the signal is aborted, reject
          controller.signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          }, { once: true });
        });

        // Polling as fallback only — starts after a delay so SSE has a
        // chance to deliver the terminal event first.
        const pollPromise = pollGeneration(created.id, controller.signal);

        // Race: SSE terminal event wins if it arrives before polling.
        const result = await Promise.race([ssePromise, pollPromise]);

        cleanupSSE();
        return result;
      } finally {
        cleanupSSE();
        setIsGenerating(false);
        setProgress(0);
        setProgressMessage(null);
        abortRef.current = null;
      }
    },
    [subscribeWithReconnect, cleanupSSE]
  );

  const generateImages = useCallback(
    (payload: GeneratePayload) => run(() => generate(payload)),
    [run]
  );

  const refineImages = useCallback(
    (payload: RefinePayload) => run(() => refine(payload)),
    [run]
  );

  const generateSeriesImages = useCallback(
    (payload: SeriesGeneratePayload) => run(() => generateSeries(payload)),
    [run]
  );

  return {
    isGenerating,
    progress,
    progressMessage,
    generateImages,
    refineImages,
    generateSeriesImages,
    cancel
  };
}
