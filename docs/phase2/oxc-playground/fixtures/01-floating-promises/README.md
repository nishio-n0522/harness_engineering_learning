# 01: floating-promises

## 検証対象

`async` 関数の戻り値（Promise）を `await` / `.then` / `.catch` / `void` のいずれでも処理せず捨てている状態を検出できるか。エラーが起きても呼び出し側に伝わらず、unhandled rejection になる典型バグ。

## 該当するルール

| ツール | ルール名 | 対応状況 |
|---|---|---|
| ESLint (typescript-eslint) | `@typescript-eslint/no-floating-promises` | ✅ stable（要 type-aware） |
| Oxlint (tsgolint) | `typescript/no-floating-promises` | ✅ alpha |
| Biome v2 | `noFloatingPromises` | ⚠️ 実行で挙動確認 |

## 期待される挙動

- `bad.ts`: **3 件**（floating-promise の 3 バリエーション）
  - **A**: read 系 async を呼びっぱなし（`fetchUser('123')`）
  - **B**: write 系 async を呼びっぱなし（`saveUser({...})`）— read より実害大
  - **C**: `.then(...)` だけで `.catch` が無い — `await` 以外の書き方でも検出される
- `good.ts`: 0 件

## React / TanStack 文脈での意味

- React のクリックハンドラ内で `mutation.mutateAsync()` や fetch ラッパーを `await` せずに呼ぶと、エラーが起きてもエラーバウンダリにも捕捉されず、ユーザに何も通知できない
- TanStack Query の `mutate` は同期 API（fire-and-forget）だが、`mutateAsync` は Promise を返す。混同して `mutateAsync` の戻り値を捨てる事故が起きやすい
- 「並列で 3 回 fetch して全部待つ」つもりが `forEach(async ...)` で並列発火＆即返却、というパターンも本質は同じ問題（fixture 02 で扱う）
