// 修正方針:
// - any を unknown に置き換える（外界からの値はまず unknown で受ける）
// - TypeScript 4.9+ の `'k' in obj` narrowing を活用すれば、`as` アサーションなしで型ガードが書ける
// - 実プロジェクトでは Zod / Valibot / ArkType などの runtime validator を使うのが現実解。
//   ここでは「ライブラリなしでも narrowing で違反は消える」ことを示すためあえて手書き

type Profile = { user: { name: string } };
type ApiProfile = { displayName: string };

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  if (!('user' in value)) return false;
  const user = value.user;
  if (typeof user !== 'object' || user === null) return false;
  if (!('name' in user)) return false;
  return typeof user.name === 'string';
}

function isApiProfile(value: unknown): value is ApiProfile {
  if (typeof value !== 'object' || value === null) return false;
  if (!('displayName' in value)) return false;
  return typeof value.displayName === 'string';
}

export function parsePayload(json: string): string {
  const data: unknown = JSON.parse(json);
  if (!isProfile(data)) {
    throw new Error('invalid payload');
  }
  return data.user.name;
}

export async function fetchProfile(): Promise<string> {
  const res = await fetch('/api/me');
  const profile: unknown = await res.json();
  if (!isApiProfile(profile)) {
    throw new Error('invalid profile response');
  }
  return profile.displayName;
}

export function logError(): void {
  try {
    throw new Error('boom');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.message.toUpperCase());
    } else {
      console.log(String(error));
    }
  }
}
