import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface GenerationEvent {
  type: 'started' | 'progress' | 'completed' | 'failed';
  generationId: string;
  tenantId: string;
  progress?: number;
  message?: string;
  timestamp: Date;
}

@Injectable()
export class GenerationEventsService {
  private readonly logger = new Logger(GenerationEventsService.name);
  private readonly events$ = new Map<string, Subject<GenerationEvent>>();

  getEvents(generationId: string): Observable<GenerationEvent> {
    if (!this.events$.has(generationId)) {
      this.events$.set(generationId, new Subject<GenerationEvent>());
    }
    return this.events$.get(generationId)!.asObservable();
  }

  emit(event: GenerationEvent): void {
    const subject = this.events$.get(event.generationId);
    if (subject) {
      subject.next(event);
      this.logger.debug(`Event emitted: ${event.type} for ${event.generationId}`);
    }
  }

  complete(generationId: string): void {
    const subject = this.events$.get(generationId);
    if (subject) {
      subject.complete();
      this.events$.delete(generationId);
    }
  }

  emitStarted(generationId: string, tenantId: string): void {
    this.emit({
      type: 'started',
      generationId,
      tenantId,
      progress: 0,
      timestamp: new Date(),
    });
  }

  emitProgress(generationId: string, tenantId: string, progress: number, message?: string): void {
    this.emit({
      type: 'progress',
      generationId,
      tenantId,
      progress,
      message,
      timestamp: new Date(),
    });
  }

  emitCompleted(generationId: string, tenantId: string): void {
    this.emit({
      type: 'completed',
      generationId,
      tenantId,
      progress: 100,
      timestamp: new Date(),
    });
    this.complete(generationId);
  }

  emitFailed(generationId: string, tenantId: string, message: string): void {
    this.emit({
      type: 'failed',
      generationId,
      tenantId,
      message,
      timestamp: new Date(),
    });
    this.complete(generationId);
  }
}
