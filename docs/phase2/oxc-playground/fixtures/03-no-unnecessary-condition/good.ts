// 修正方針: 型を信じる。「本当に optional」なら型でそう書く

type User = {
  id: string;
  name: string;
  email: string;
};

export function greet(user: User): string {
  return `Hello, ${user.name}`;
}

export function getDomain(user: User): string {
  // noUncheckedIndexedAccess: true なので [1] は string | undefined
  // よって ?? 'unknown' はここでは正当（このルールは発火しない）
  return user.email.split('@')[1] ?? 'unknown';
}

export function isAdult(age: number): boolean {
  return age >= 18;
}

// 「本当に optional」なら型でそう書く
type MaybeUser = { id: string; name?: string };

export function greetMaybe(user: MaybeUser): string {
  return user.name ? `Hello, ${user.name}` : 'Hello';
}
