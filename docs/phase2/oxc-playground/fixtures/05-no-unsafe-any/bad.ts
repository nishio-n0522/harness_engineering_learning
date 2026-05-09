// 検証する違反: any 経由のアクセスで型安全性が破綻
//
// 主な発生源:
// 1. JSON.parse の戻り値（any）に対する直接 property アクセス
// 2. fetch().json() の戻り値（any 同然）の連鎖アクセス
// 3. catch (error: any) で error を any 化、その後の任意操作

export function parsePayload(json: string): string {
  // 問題1: JSON.parse の戻り値は any。data.user.name のアクセスが型ノーガード
  const data = JSON.parse(json);
  return data.user.name;
}

export async function fetchProfile(): Promise<string> {
  const res = await fetch('/api/me');
  // 問題2: res.json() の戻り値は any。profile.displayName が型ノーガード
  // returns に流すと、呼び出し側にも any が伝播する
  const profile = await res.json();
  return profile.displayName;
}

export function logError(): void {
  try {
    throw new Error('boom');
  } catch (error: any) {
    // 問題3: any 型の error に任意のプロパティアクセス
    // - any の使用そのものが no-explicit-any 違反
    // - error.message へのアクセスが no-unsafe-member-access
    // - .toUpperCase() の呼び出しが no-unsafe-call
    // - console.log への引数が no-unsafe-argument
    console.log(error.message.toUpperCase());
  }
}
