// 検証する違反: Promise を await せず、.catch も付けず、void でも囲っていない
//
// 問題: 戻り値の Promise がどこにも繋がっていない。エラーが起きても上位に伝わらず、
// Node 22 / 最新ブラウザでは unhandled rejection の警告は出るが、アプリ側で通知できない。
// この fixture では floating-promise の代表的な 3 バリエーションを並べる。

async function fetchUser(id: string): Promise<{ name: string }> {
  const res = await fetch(`/api/users/${id}`);
  return res.json() as Promise<{ name: string }>;
}

async function saveUser(user: { name: string }): Promise<void> {
  await fetch('/api/users', { method: 'POST', body: JSON.stringify(user) });
}

export function handleClick(): void {
  // 問題1（バリエーション A）: read 系の async を呼びっぱなし
  fetchUser('123');

  // 問題2（バリエーション B）: write 系を捨てるパターン
  // 失敗しても誰にも伝わらない。read より実害が大きい
  saveUser({ name: 'alice' });
}

export function loadOnMount(): void {
  // 問題3（バリエーション C）: .then で結果は受け取っているが .catch を書いていない
  // → fetch 失敗 / handler 内のエラー / rejection が握り潰される
  // 「await ではない書き方」も同じく floating-promise として検出される好例
  fetchUser('initial').then((user) => {
    console.log(user.name);
  });
}
