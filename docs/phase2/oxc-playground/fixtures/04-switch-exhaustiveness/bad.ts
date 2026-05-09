// 検証する違反: discriminated union の switch で全ケースを網羅していない
//
// 問題: 型に新しい variant を追加したとき、追加し忘れた switch が黙ってすり抜ける。
// 実害が出るまで気付かない典型的バグ。

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export function statusLabel(status: RequestStatus): string {
  // 問題1: 'error' を処理していない
  switch (status) {
    case 'idle':
      return '待機中';
    case 'loading':
      return '読み込み中';
    case 'success':
      return '完了';
  }
  return '';
}

type Action =
  | { type: 'increment'; by: number }
  | { type: 'decrement'; by: number }
  | { type: 'reset' };

export function reducer(state: number, action: Action): number {
  // 問題2: 'reset' を処理していない
  switch (action.type) {
    case 'increment':
      return state + action.by;
    case 'decrement':
      return state - action.by;
  }
  return state;
}
