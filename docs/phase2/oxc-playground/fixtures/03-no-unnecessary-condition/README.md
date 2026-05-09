# 03: no-unnecessary-condition

## 検証対象

型システム的に常に `true` または常に `false` になる条件分岐（不要なガード、不要な optional chain、必須プロパティへの `!=`/`==` チェックなど）を検出できるか。「念のため」を書きすぎることで、本来不要なコードパスを通したテストが書かれなくなる。

## 該当するルール

| ツール | ルール名 | 対応状況 |
|---|---|---|
| ESLint (typescript-eslint) | `@typescript-eslint/no-unnecessary-condition` | ✅ stable（要 type-aware） |
| Oxlint (tsgolint) | `typescript/no-unnecessary-condition` | ✅ alpha |
| Biome v2 | （直接の対応ルールなし） | ❌ 実行で確認 |

## 期待される挙動

- `bad.ts`: **3 件**（`if (user)` + `email?.split` + `age !== undefined`）
- `good.ts`: 0 件

## 学習メモ：`if (user.name)` は flagged されない

bad.ts には `if (user.name)` も書いてあり、直感的には「`name: string` は必須なんだから常に truthy」と思いがちですが、ESLint はこれを flagged しません。

理由は **`string` 型は `''`（空文字列）を含み、空文字列は falsy** だからです：

| 型 | `if (x)` を flagged する？ |
|---|---|
| `object`（必須プロパティ・引数）| ✅ flagged（`{}` も truthy） |
| `string` | ❌ flagged されない（`''` は falsy） |
| `number` | ❌ flagged されない（`0` は falsy） |
| `string \| undefined` | ❌ flagged されない |
| `null` 単独型 | ✅ flagged（常に false） |

つまり「型レベルで常に truthy/falsy が確定するか」が判定基準で、value level（実値）で空文字や 0 を含む型は素通りします。「`if (name && name.length > 0)` を簡潔に書くために `if (name)` で済ませる」イディオムを許容するための仕様です。

これは **type-aware ルールの限界** の好例で、「型情報があれば全て検出できる」ではないことを示します。AST と型推論を統合してもなお、value level の意味（空文字を許すか否か）はチーム慣習で決まる領域です。

## React / TanStack 文脈での意味

- TanStack Query の `data` は型上 `T | undefined` だが、`isSuccess` で絞り込んだあとに更に `if (data)` を書く冗長パターンが頻発
- Zod でパースした後の object に対して optional chain を付け続ける（パース時点で必須なのに）
- TypeScript の strict 設定で運用しているチームが「念のための null チェック」を残しがち。型を信じる文化に切り替えるトリガーとして有効
- 注意: `noUncheckedIndexedAccess: true` を有効にしているので、`array[0]` は `T | undefined`。`?? 'fallback'` のような書き方は **正当** で、このルールは発火しない
