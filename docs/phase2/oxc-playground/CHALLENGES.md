# 設定構築チャレンジ

このリポジトリの **学習目的** は、`fixtures/` 配下の bad.ts が想定通りに検出される lint / formatter 設定を **あなた自身が書く** こと。

## 進め方

- 各 fixture の `README.md` に「期待される検出件数」と「該当するルール（ツール別）」が書いてある
- それを満たすように `configs/` 配下のファイルを編集する
- `pnpm lint:*` / `pnpm fmt:*` で動かして、件数を照合する
- `_solutions/` に答えがある（**見たら負け**）

## チャレンジ

### CH-01 ESLint で fixture 01 を 3 件検出

- 編集対象: `configs/eslint.config.js`
- 達成基準: 以下が **3 件のエラー** を出すこと

```bash
pnpm exec eslint --config configs/eslint.config.js fixtures/01-floating-promises/bad.ts
```

### CH-02 fixture 02〜05 もカバーするように拡張

- 編集対象: `configs/eslint.config.js`
- 達成基準: `pnpm lint:eslint` で **合計 22 件**
  - 内訳は各 fixture の README 参照（01: 3 / 02: 5 / 03: 3 / 04: 2 / 05: 9）
- bonus: good.ts では **0 件**

### CH-03 Oxlint で同じ fixture を検出する

- 編集対象: `configs/.oxlintrc.json`
- 達成基準:
  - `pnpm lint:oxlint` で構文系を検出
  - `pnpm lint:oxlint:type-aware` で type-aware も含めて検出
  - 件数は ESLint と完全一致しなくても良い。**何が取れて何が取れないかを観察する** のが目的

### CH-04 Biome v2 で fixture を試す

- 編集対象: `configs/biome.json`
- 達成基準: `pnpm lint:biome` を回す
  - 取れる範囲を取って、取れないルールがどれかを記録する
  - これが Biome の「現在地」を知る一次情報になる

### CH-05 Formatter（Prettier / oxfmt）の設定

- 編集対象: `configs/.prettierrc.json` / `.oxfmtrc.json`
- 達成基準: `pnpm fmt:prettier:check` / `pnpm fmt:oxfmt:check` が exit 0 で通る
- 本番演習は Phase 5 で fixture 10（formatter-edge-cases）を作ってから

## 詰まったら

1. まず公式ドキュメントを当たる
   - typescript-eslint, oxlint, Biome, Prettier, oxfmt はすべて公式サイトに型注釈付きの設定リファレンスがある
2. それでも分からない箇所はピンポイントの質問をどうぞ（「parserOptions.project は何を指すべき？」のような限定質問はヒント扱いにしません）
3. `_solutions/` を開くのは最終手段

## 自分への問い（findings.md に書く価値あるもの）

これらに自分の言葉で答えられるようになると「lint 設定が分かった」と言える：

- ESLint で type-aware を有効化するために何が必要か（一発では動かないはず）
- なぜ fixture 03 / 04 のルールは `recommended-type-checked` で発火しないのか
- Oxlint と ESLint のルール名のマッピングはどう調べるか
- Biome v2 でカバーできない fixture は何か、その理由は
- formatter（Prettier / oxfmt）が「設定がほとんど無い」のはなぜ設計上そうなっているか
