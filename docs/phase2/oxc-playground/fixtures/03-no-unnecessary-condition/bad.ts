// 検証する違反: 型システム的に常に true / 常に false な条件分岐
//
// 問題: 「念のためのガード」を書きすぎると、
// - 読み手が「ここは undefined になり得る」と誤解する
// - 実際には到達不能なコードを通すテストが書かれない
// - 型を狭めるリファクタの障害になる

type User = {
  id: string;
  name: string;
  email: string;
};

export function greet(user: User): string {
  // 問題1: user は必須引数。常に truthy
  if (user) {
    // 問題2: name も必須プロパティ。常に truthy
    if (user.name) {
      return `Hello, ${user.name}`;
    }
  }
  return 'Hello';
}

export function getDomain(user: User): string {
  // 問題3: email は必須なので optional chain は不要
  return user.email?.split('@')[1] ?? 'unknown';
}

export function isAdult(age: number): boolean {
  // 問題4: number 型は常に number。undefined と比較しても false しか出ない
  return age !== undefined && age >= 18;
}
