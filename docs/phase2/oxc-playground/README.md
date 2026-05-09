# oxc-playground

Phase 2 学習教材。**ESLint / Oxlint / Biome / Prettier / Oxfmt** を同じ fixture に食わせて、検出能力・速度・auto-fix 品質の違いを実測する。

詳細な仕様は親ディレクトリの [`../oxc-playground-spec.md`](../oxc-playground-spec.md) 参照。

## 学習モード

このリポジトリの主目的は **「あなたが lint / formatter の設定を書く」** こと。
- fixture（`bad.ts` / `good.ts`）と「期待される検出件数」は AI が用意した「**問題編**」
- `configs/` 配下の設定はあなたが書く「**解答編**」
- チャレンジは [`CHALLENGES.md`](./CHALLENGES.md) を参照
- `_solutions/` に答えがあるが、**見たら負け** ルール

## ディレクトリ構成

```
oxc-playground/
├── configs/          各ツールの設定ファイル（oxfmt 以外を集約）
│   ├── eslint.config.js
│   ├── .oxlintrc.json
│   ├── biome.json
│   └── .prettierrc.json
├── .oxfmtrc.json     oxfmt 専用（cwd 探索のためルート直下に置く / decision-log.md 参照）
├── fixtures/         検証用コード。NN-kebab-case で連番、bad/good ペア
├── scripts/          ベンチマーク・検出マトリクス生成スクリプト
├── results/          実行結果出力先（git ignore）
├── docs/             findings.md / decision-log.md
├── package.json
├── tsconfig.json
├── tsconfig.fixtures.json   fixture 用の緩い tsconfig（ESLint type-aware が参照）
├── mise.toml
└── .devcontainer/
```

## セットアップ手順

> **本リポジトリは独立した npm プロジェクト** です。親リポジトリの `node_modules` とは別管理になります。`cd docs/phase2/oxc-playground` してから操作してください。

### Step 0: 前提環境

- mise（任意） / pnpm / Node.js 22+

mise を使うなら:

```bash
cd docs/phase2/oxc-playground
mise install
```

### Step 1: 依存インストール

```bash
pnpm install
```

`oxlint-tsgolint`（type-aware の alpha バックエンド）は alpha 段階のため、まれに resolve に失敗します。失敗した場合は一旦 `package.json` の `devDependencies` から外して再試行し、Phase 1 動作確認は **type-aware を除く 6 コマンド** で行ってください。

### Step 2: Phase 1 動作確認

以下 7 コマンドがすべて **exit 0** で終わることを確認します（`fixtures/_placeholder.ts` を 1 ファイル置いてあるため検出 0 件で通る想定。`_placeholder.ts` は Phase 3 で fixture 作成を始める際に削除します）。

```bash
pnpm lint:eslint
pnpm lint:oxlint
pnpm lint:oxlint:type-aware     # oxlint-tsgolint が入っていれば
pnpm lint:biome
pnpm fmt:prettier:check
pnpm fmt:oxfmt:check
pnpm fmt:biome:check
```

このとき各ツールの **バージョン** を控えておくと後で findings.md に書きやすいです。

```bash
pnpm exec eslint --version
pnpm exec oxlint --version
pnpm exec biome --version
pnpm exec prettier --version
pnpm exec oxfmt --version
```

ここまで通れば Phase 1 完了です。Claude に動作確認結果を伝えれば Phase 2（設定ファイルの本格構成）に進みます。

## Phase 進捗

| Phase | 内容 | 状況 |
|---|---|---|
| 1 | 環境セットアップ（本ステップ） | 実装済み・動作確認待ち |
| 2 | 設定ファイル本格構成（recommended-type-checked など） | 未着手 |
| 3 | Type-aware fixture（01〜05） | 未着手 |
| 4 | フレームワーク fixture（06〜08） | 未着手 |
| 5 | 構造系 / Formatter fixture（09〜10） | 未着手 |
| 6 | ベンチマークスクリプト実装 | 未着手 |
| 7 | ドキュメント整備 | 未着手 |

## トラブルシュート

- **`oxlint-tsgolint` が npm 上で見つからない**: パッケージ名が変更されている可能性あり。`npm view oxlint-tsgolint` または oxc 公式ドキュメントで現行名を確認。
- **Biome v2 で warning が大量に出る**: `pnpm exec biome migrate` で旧設定からの自動変換が可能。
- **`oxfmt --check` が「No config found」を出す**: Phase 2 でルート直下の `.oxfmtrc.json` 配置に切り替え済み。それでも出る場合は cwd が想定通りか（`pnpm` から起動できているか）確認。
- **`mise` がない**: スキップ可。`node --version` が 22 系であれば問題なし。

## ライセンス・取り扱い

学習教材のため公開は想定していません。fixture には意図的に問題のあるコードが含まれます。
