import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, toArray } from 'rxjs';
import { GenerationEventsService } from './generation-events.service';

describe('GenerationEventsService', () => {
  describe('getEvents', () => {
    it('creates a new Subject on first call and returns same Observable on subsequent calls', () => {
      const service = new GenerationEventsService();
      const events1: unknown[] = [];
      const events2: unknown[] = [];
      service.getEvents('g1').subscribe((e) => events1.push(e));
      service.getEvents('g1').subscribe((e) => events2.push(e));

      service.emit({ type: 'started', generationId: 'g1', tenantId: 't1', timestamp: new Date() });
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });
  });

  describe('emit', () => {
    it('pushes event to subscribers of the generationId', () => {
      const service = new GenerationEventsService();
      const events: unknown[] = [];
      service.getEvents('g1').subscribe((e) => events.push(e));

      service.emit({ type: 'started', generationId: 'g1', tenantId: 't1', progress: 0, timestamp: new Date() });
      service.emit({ type: 'progress', generationId: 'g1', tenantId: 't1', progress: 50, timestamp: new Date() });

      expect(events).toHaveLength(2);
      expect((events[0] as { type: string }).type).toBe('started');
      expect((events[1] as { type: string }).type).toBe('progress');
    });

    it('does not throw when emitting to an unsubscribed generationId', () => {
      const service = new GenerationEventsService();
      expect(() =>
        service.emit({ type: 'started', generationId: 'unknown', tenantId: 't1', timestamp: new Date() })
      ).not.toThrow();
    });
  });

  describe('complete', () => {
    it('completes the Subject and removes it from the map', () => {
      const service = new GenerationEventsService();
      let completed = false;
      service.getEvents('g1').subscribe({ complete: () => { completed = true; } });

      service.complete('g1');
      expect(completed).toBe(true);

      const newObs = service.getEvents('g1');
      expect(newObs).toBeDefined();
    });

    it('is a noop when generationId does not exist', () => {
      const service = new GenerationEventsService();
      expect(() => service.complete('unknown')).not.toThrow();
    });
  });

  describe('convenience emitters', () => {
    it('emitStarted emits started event with progress=0', () => {
      const service = new GenerationEventsService();
      const events: unknown[] = [];
      service.getEvents('g1').subscribe((e) => events.push(e));
      service.emitStarted('g1', 't1');
      expect(events).toHaveLength(1);
      expect((events[0] as { type: string; progress: number })).toEqual(
        expect.objectContaining({ type: 'started', progress: 0 })
      );
    });

    it('emitProgress emits progress event with message', () => {
      const service = new GenerationEventsService();
      const events: unknown[] = [];
      service.getEvents('g1').subscribe((e) => events.push(e));
      service.emitProgress('g1', 't1', 50, '处理中');
      expect((events[0] as { type: string; progress: number; message: string })).toEqual(
        expect.objectContaining({ type: 'progress', progress: 50, message: '处理中' })
      );
    });

    it('emitCompleted emits completed event with progress=100 and completes the Subject', () => {
      const service = new GenerationEventsService();
      const events: unknown[] = [];
      let completed = false;
      service.getEvents('g1').subscribe({ next: (e) => events.push(e), complete: () => { completed = true; } });
      service.emitCompleted('g1', 't1');
      expect((events[0] as { type: string; progress: number })).toEqual(
        expect.objectContaining({ type: 'completed', progress: 100 })
      );
      expect(completed).toBe(true);
    });

    it('emitFailed emits failed event with message and completes the Subject', () => {
      const service = new GenerationEventsService();
      const events: unknown[] = [];
      let completed = false;
      service.getEvents('g1').subscribe({ next: (e) => events.push(e), complete: () => { completed = true; } });
      service.emitFailed('g1', 't1', 'LLM timeout');
      expect((events[0] as { type: string; message: string })).toEqual(
        expect.objectContaining({ type: 'failed', message: 'LLM timeout' })
      );
      expect(completed).toBe(true);
    });
  });
});
