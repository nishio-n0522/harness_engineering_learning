# 04: switch-exhaustiveness

## 検証対象

discriminated union を `switch` で分岐するときに、union のすべての variant を網羅していない状態を検出できるか。union に新しい variant を追加したとき、追加し忘れた switch が黙ってすり抜ける典型バグ。

## 該当するルール

| ツール | ルール名 | 対応状況 |
|---|---|---|
| ESLint (typescript-eslint) | `@typescript-eslint/switch-exhaustiveness-check` | ✅ stable（要 type-aware） |
| Oxlint (tsgolint) | `typescript/switch-exhaustiveness-check` | ✅ alpha |
| Biome v2 | （直接対応なし、`noFallthroughSwitchClause` は別物） | ❌ 実行で確認 |

## 期待される挙動

- `bad.ts`: **2 件**（`statusLabel` の `error` 漏れ + `reducer` の `reset` 漏れ）
- `good.ts`: 0 件

## React / TanStack 文脈での意味

- TanStack Query の `status` は `'idle' | 'pending' | 'success' | 'error'`（v5 で `'idle'` は無いが）。これを switch で分岐する UI コンポーネントでは exhaustiveness が地味に効く
- Zustand のアクションを discriminated union で表現する場合、reducer 側で網羅性が要る
- Zod の `discriminatedUnion` で定義したスキーマに対して分岐する場面でも同様
- 「`assertNever` で将来の variant 追加時にコンパイルエラーが出る」仕組みは型駆動開発の基本イディオム
