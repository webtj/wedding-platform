type Props = { colSpan: number; message?: string };

export function EmptyState({ colSpan, message = '暂无数据' }: Props) {
  return (
    <tr>
      <td colSpan={colSpan} className='h-24 text-center text-muted-foreground'>
        {message}
      </td>
    </tr>
  );
}
