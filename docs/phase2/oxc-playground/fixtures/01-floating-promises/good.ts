// 修正方針:
// - await を付けて結果（とエラー）を上位に伝える
// - 「結果を待たない」ことを明示したいなら void で囲い、必ず .catch でエラーをログする

async function fetchUser(id: string): Promise<{ name: string }> {
  const res = await fetch(`/api/users/${id}`);
  return res.json() as Promise<{ name: string }>;
}

async function saveUser(user: { name: string }): Promise<void> {
  await fetch('/api/users', { method: 'POST', body: JSON.stringify(user) });
}

export async function handleClick(): Promise<void> {
  try {
    await fetchUser('123');
    await saveUser({ name: 'alice' });
  } catch (error) {
    console.error('user operation failed', error);
  }
}

export function loadOnMount(): void {
  // 「結果は気にしない」場合は void で意図を明示する
  void fetchUser('initial').catch((error: unknown) => {
    console.error('initial fetch failed', error);
  });
}
