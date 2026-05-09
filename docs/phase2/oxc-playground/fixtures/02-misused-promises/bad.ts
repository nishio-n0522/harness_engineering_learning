// 検証する違反: Promise を期待していない場所で async 関数を使っている
//
// 主なパターン:
// 1. async 関数を boolean を期待する場面 (if/while/&&/||) で評価
// 2. forEach に async を渡す（戻り値の Promise が捨てられる）
// 3. timer 系コールバックに async を渡す（reject がどこにも伝わらない）

async function isAdmin(userId: string): Promise<boolean> {
  const res = await fetch(`/api/users/${userId}/admin`);
  return res.status === 200;
}

async function fetchUser(id: string): Promise<{ name: string }> {
  const res = await fetch(`/api/users/${id}`);
  return res.json() as Promise<{ name: string }>;
}

export async function showAdminPanel(userId: string): Promise<void> {
  // 問題1: isAdmin の戻り値は Promise<boolean>。Promise オブジェクトは常に truthy
  // この if は意図に反して常に true 側へ進む
  if (isAdmin(userId)) {
    console.log('admin panel');
  }
}

export function logAllUsers(ids: string[]): void {
  // 問題2: forEach は callback の戻り値（Promise）を待たない
  // 全 fetch は並列発火されるが「待つ」ことはなく、関数は即返る
  ids.forEach(async (id) => {
    const user = await fetchUser(id);
    console.log(user.name);
  });
}

export function setTimer(): void {
  // 問題3: setTimeout は callback の戻り値を見ない
  // async callback の reject はどこにも伝わらず unhandled rejection
  setTimeout(async () => {
    await fetchUser('timer');
  }, 1000);
}
