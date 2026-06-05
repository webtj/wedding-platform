import { KBarResults, useMatches, type ActionImpl } from 'kbar';
import ResultItem from './result-item';

function renderItem({ item, active, rootActionId }: { item: string | ActionImpl; active: boolean; rootActionId: string }) {
  if (typeof item === 'string') {
    return <div className='text-muted-foreground px-4 py-2 text-sm uppercase'>{item}</div>;
  }
  return <ResultItem action={item} active={active} currentRootActionId={rootActionId} />;
}

export default function RenderResults() {
  const { results, rootActionId } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        renderItem({ item: item as string | ActionImpl, active, rootActionId: rootActionId ?? '' })
      }
    />
  );
}
