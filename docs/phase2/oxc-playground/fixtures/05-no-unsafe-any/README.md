# 05: no-unsafe-any

## 検証対象

`any` 型（あるいは `any` を返す API）を経由したアクセスで型安全性が破綻している状態を検出できるか。`JSON.parse` の戻り値、`fetch().json()` の戻り値、`catch` 句の `error` などが代表的な発生源。

## 該当するルール

`no-unsafe-*` 系は複数ルールで構成されており、1 箇所のコードに対して **複数のルールが同時に発火** する。期待件数は厳密な値ではなく、ツール間の比較指標として捉える。

| ツール | ルール名 | 対応状況 |
|---|---|---|
| ESLint (typescript-eslint) | `@typescript-eslint/no-unsafe-assignment` | ✅ stable（要 type-aware） |
| ESLint (typescript-eslint) | `@typescript-eslint/no-unsafe-member-access` | ✅ stable |
| ESLint (typescript-eslint) | `@typescript-eslint/no-unsafe-call` | ✅ stable |
| ESLint (typescript-eslint) | `@typescript-eslint/no-unsafe-return` | ✅ stable |
| ESLint (typescript-eslint) | `@typescript-eslint/no-unsafe-argument` | ✅ stable |
| ESLint (typescript-eslint) | `@typescript-eslint/no-explicit-any` | ✅ recommended（type-aware 不要） |
| Oxlint (tsgolint) | `typescript/no-unsafe-*` | ✅ alpha（一部） |
| Biome v2 | `noExplicitAny` のみ | ⚠️ no-unsafe-* 系は限定的 |

## 期待される挙動

- `bad.ts`: **目安 8〜12 件**（複数の no-unsafe-* が同じ箇所で重ねて発火）
- `good.ts`: 0 件

## React / TanStack 文脈での意味

- API レスポンスの型を信じすぎる癖を可視化する fixture。**Zod でパースする習慣** に持ち込む動機付けになる
- `useQuery` の `queryFn` の戻り値型を `any` のまま扱うと、コンポーネント全体に any が伝播する
- `catch (error)` を `error: any` で受けるのは TypeScript 4.4 以降は `unknown` がデフォルト。明示的に `: any` を書くこと自体が違反対象
- このルールは **ノイズが多い** のでチーム導入時はストレスになる。「導入するなら最初に Zod を入れる」のような戦略パッケージで議論する材料
