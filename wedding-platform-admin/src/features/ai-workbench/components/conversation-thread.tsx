'use client';

import type { AiGeneration } from '../api/types';
import { AiBubble, UserBubble, type ChatMessage } from './message-bubble';

interface ConversationThreadProps {
  messages: ChatMessage[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onPreview: (url: string) => void;
  onRegenerate: () => void;
  onDownloadAll: (generation: AiGeneration) => void;
  onDownloadOne: (generation: AiGeneration, index: number) => void;
  onBookmark: (generation: AiGeneration) => void;
  onImageSelect?: (generationId: string, imageId: string) => void;
  onImageBookmark?: (generationId: string, imageId: string, isBookmarked: boolean) => void;
}

export function ConversationThread({
  messages,
  scrollRef,
  onPreview,
  onRegenerate,
  onDownloadAll,
  onDownloadOne,
  onBookmark,
  onImageSelect,
  onImageBookmark
}: ConversationThreadProps) {
  return (
    <div ref={scrollRef} className='min-h-0 flex-1 overflow-y-auto px-4 py-6'>
      <div className='mx-auto flex max-w-3xl flex-col gap-7'>
        {messages.map((message) => {
          if (message.role === 'user') {
            return <UserBubble key={message.id} message={message} />;
          }
          return (
            <AiBubble
              key={message.id}
              message={message}
              onPreview={onPreview}
              onRegenerate={onRegenerate}
              onDownloadAll={onDownloadAll}
              onDownloadOne={onDownloadOne}
              onBookmark={onBookmark}
              onImageSelect={onImageSelect}
              onImageBookmark={onImageBookmark}
            />
          );
        })}
      </div>
    </div>
  );
}
