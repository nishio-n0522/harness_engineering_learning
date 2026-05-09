// 修正方針:
// 1. boolean が必要な場面では await して値を取り出す
// 2. forEach の代わりに for...of + await（順次）か Promise.all（並列）
// 3. timer 系では void + .catch で「結果を待たないが reject は捕捉する」を明示

async function isAdmin(userId: string): Promise<boolean> {
  const res = await fetch(`/api/users/${userId}/admin`);
  return res.status === 200;
}

async function fetchUser(id: string): Promise<{ name: string }> {
  const res = await fetch(`/api/users/${id}`);
  return res.json() as Promise<{ name: string }>;
}

export async function showAdminPanel(userId: string): Promise<void> {
  if (await isAdmin(userId)) {
    console.log('admin panel');
  }
}

// 順次: 1 件ずつ完了を待ってから次へ
export async function logAllUsersSequential(ids: string[]): Promise<void> {
  for (const id of ids) {
    const user = await fetchUser(id);
    console.log(user.name);
  }
}

// 並列: まとめて投げて全完了を待つ
export async function logAllUsersParallel(ids: string[]): Promise<void> {
  const users = await Promise.all(ids.map((id) => fetchUser(id)));
  for (const user of users) {
    console.log(user.name);
  }
}

export function setTimer(): void {
  setTimeout(() => {
    void fetchUser('timer').catch((error: unknown) => {
      console.error('timer fetch failed', error);
    });
  }, 1000);
}
