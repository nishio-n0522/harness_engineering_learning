// 修正方針:
// - 全ケースを網羅
// - default に assertNever を置き「将来 variant が追加されたらコンパイルエラー」を仕込む

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`);
}

export function statusLabel(status: RequestStatus): string {
  switch (status) {
    case 'idle':
      return '待機中';
    case 'loading':
      return '読み込み中';
    case 'success':
      return '完了';
    case 'error':
      return 'エラー';
    default:
      return assertNever(status);
  }
}

type Action =
  | { type: 'increment'; by: number }
  | { type: 'decrement'; by: number }
  | { type: 'reset' };

export function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'increment':
      return state + action.by;
    case 'decrement':
      return state - action.by;
    case 'reset':
      return 0;
    default:
      return assertNever(action);
  }
}
