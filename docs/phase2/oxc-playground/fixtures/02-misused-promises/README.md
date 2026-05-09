# 02: misused-promises

## 検証対象

Promise を返す関数を、Promise を期待していない場所（`if` の条件式、`forEach`、`setTimeout` など）で使っている状態を検出できるか。`floating-promises` と並ぶ「async 関連の代表的な誤用」。

## 該当するルール

| ツール | ルール名 | 対応状況 |
|---|---|---|
| ESLint (typescript-eslint) | `@typescript-eslint/no-misused-promises` | ✅ stable（要 type-aware） |
| Oxlint (tsgolint) | `typescript/no-misused-promises` | ✅ alpha |
| Biome v2 | `noMisusedPromises` | ⚠️ 実行で挙動確認 |

## 期待される挙動

- `bad.ts`: **5 件**（`if (isAdmin(userId))` の 1 行から **3 つのルールが連鎖発火** する）
  - `no-misused-promises` × 3（`if (asyncFn())` + `forEach(async)` + `setTimeout(async)`）
  - `no-unnecessary-condition` × 1（`if (isAdmin(userId))` — Promise オブジェクトは常に truthy）
  - `require-await` × 1（`showAdminPanel` 関数は `async` だが内部に `await` が無い）
- `good.ts`: 0 件

## 学習メモ：1 つのバグに 3 つのルールが反応

`if (isAdmin(userId))` の 1 行に対して、3 つの type-aware ルールが **異なる視点で同時に** エラーを上げます：

| ルール | 視点 |
|---|---|
| `no-misused-promises` | 「boolean を期待する場所で Promise を渡している」 |
| `no-unnecessary-condition` | 「Promise オブジェクトは常に truthy なのでこの if は意味が無い」 |
| `require-await` | 「`async` 関数なのに `await` が無い」（関数全体に対して） |

ESLint のルールは **網状に互いを補強する** 設計です。1 つのバグが複数の角度から検出される＝防御層が厚いことを意味します。「重複 warning が多くて鬱陶しい」と感じるか「セーフティネットが厚い」と感じるかはチームの文化次第。oxlint や Biome に乗り換える場合、この「網状性」がどこまで再現されるかが選定指標になります。

## React / TanStack 文脈での意味

- `<button onClick={asyncHandler}>` のように **React イベントハンドラに async 関数を直接渡す** のがこのルールの最頻ヒット箇所。React は戻り値の Promise を使わないので、実質「fire-and-forget」になる
- TanStack Query の `useMutation` を使っていても、handler 自体が `void` を期待する場面（`onSubmit` など）に async を渡すと同じ罠
- `array.forEach(async ...)` は「順次実行のつもりが並列発火」になる。`for (const x of array) { await ... }` か `Promise.all(array.map(async ...))` のどちらが意図か考える機会
