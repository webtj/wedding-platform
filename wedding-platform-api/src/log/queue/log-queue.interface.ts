export type LogType = 'request' | 'error' | 'audit' | 'event';

export interface LogEntry {
  type: LogType;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface LogQueue {
  add(entry: LogEntry): void;
  flush(): Promise<void>;
  close(): Promise<void>;
}
