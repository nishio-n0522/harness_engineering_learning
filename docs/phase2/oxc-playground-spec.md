# oxc-playground 実装仕様書

## 1. プロジェクト概要

OXC (Oxlint / Oxfmt) を中心とした JavaScript / TypeScript 静的解析ツールチェインの学習・評価のため、**意図的に問題のあるコード（fixture）と理想的なコードのペアを集めたリポジトリ** を構築する。同一の fixture に対して ESLint / Oxlint / Biome / Prettier / Oxfmt を実行し、検出能力・速度・auto-fix の質を比較できる仕組みを整える。

最終的なアウトプットは、Phoenix V3（React + TanStack 系）の Lint 戦略決定および SDD 用 steering 文書の根拠資料として利用する。

---

## 2. 背景と目的

### 2.1 背景

- 既存プロダクト（Phoenix Vision / Phoenix Cloud）では Lint 環境が既に成立しており、新ツールを評価する「自分ごとの痛み」が薄い
- OXC エコシステムは急速に進化しており、ドキュメントを読むだけでは実用上の差異が掴みにくい
- Phoenix V3 の新規スタック選定にあたり、Lint / Formatter の選択は再検討事項である

### 2.2 目的

1. 各ツールが「何を検出できて、何を検出できないか」を一覧化する
2. Phoenix V3 で発生しうる問題パターンに対するツールの反応を確認する
3. 速度・auto-fix 品質・設定の柔軟性を実測ベースで比較する
4. 検証結果を SDD steering 文書（`.steering/lint-strategy.md`）の根拠とする

### 2.3 非目的

- 本番運用可能な Lint 設定を作ること（あくまで評価用）
- すべてのルールを網羅すること（Phoenix V3 で重要なものに絞る）
- パフォーマンスチューニングの最適化

---

## 3. 技術スタック

### 3.1 ベース環境

- **パッケージマネージャ**: pnpm
- **Node.js**: 22.x 以上（ESM、TypeScript 設定ファイル native サポート）
- **TypeScript**: 5.x（strict モード）
- **mise**: ツールバージョン管理
- **DevContainer**: 推奨環境（既存 sdd-template に準拠）

### 3.2 比較対象ツール

| 種類      | ツール                                 | バージョン             |
| --------- | -------------------------------------- | ---------------------- |
| Linter    | ESLint + typescript-eslint             | 最新安定版             |
| Linter    | Oxlint                                 | 最新安定版             |
| ßßLinter  | Oxlint + oxlint-tsgolint（type-aware） | 最新安定版             |
| Linter    | Biome (linter のみ)                    | 最新安定版             |
| Formatter | Prettier                               | 最新安定版             |
| Formatter | Oxfmt                                  | 最新版（alpha でも可） |
| Formatter | Biome (formatter)                      | 最新安定版             |

### 3.3 フレームワーク文脈

- React 19
- TanStack Query / Router / Form
- Zustand
- Zod
- Tailwind CSS v4

---

## 4. ディレクトリ構成

```
oxc-playground/
├── README.md                          # プロジェクト概要、使い方
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.fixtures.json             # fixture 用の緩い tsconfig
├── mise.toml
├── .devcontainer/
│   └── devcontainer.json
│
├── configs/                           # 各ツールの設定ファイルを集約
│   ├── eslint.config.js
│   ├── .oxlintrc.json
│   ├── biome.json
│   ├── .prettierrc.json
│   └── oxfmt.config.json
│
├── fixtures/                          # 検証対象のコード集
│   ├── 01-floating-promises/
│   │   ├── README.md                  # この fixture が検証する内容
│   │   ├── bad.ts                     # 問題のあるコード
│   │   └── good.ts                    # 修正後の理想コード
│   ├── 02-misused-promises/
│   ├── 03-no-unnecessary-condition/
│   ├── 04-switch-exhaustiveness/
│   ├── 05-no-unsafe-any/
│   ├── 06-react-hooks-deps/
│   ├── 07-tanstack-query-misuse/
│   ├── 08-zustand-store-misuse/
│   ├── 09-import-cycles/
│   └── 10-formatter-edge-cases/
│
├── scripts/
│   ├── bench.ts                       # 全ツール × 全 fixture のベンチマーク
│   ├── detect-matrix.ts               # 検出マトリクス生成
│   └── format-diff.ts                 # フォーマット差分の可視化
│
├── results/                           # ベンチマーク結果の出力先（git ignore）
│   ├── bench-YYYYMMDD-HHmmss.md
│   └── detect-matrix-YYYYMMDD.md
│
└── docs/
    ├── findings.md                    # 学びと所感の記録
    └── decision-log.md                # ツール選定の判断ログ
```

### 4.1 命名規約

- fixture ディレクトリ名: `NN-kebab-case`（NN は 2 桁の連番）
- bad/good ファイル: 必ず両方を作成し、ペアで配置
- fixture が複数ファイル必要な場合: `bad/` `good/` ディレクトリを切る

---

## 5. セットアップ手順

### 5.1 初期化

```bash
pnpm init
pnpm add -D typescript @types/node
pnpm add -D eslint typescript-eslint
pnpm add -D oxlint oxlint-tsgolint
pnpm add -D @biomejs/biome
pnpm add -D prettier
# oxfmt は alpha 版を最新で取得
```

### 5.2 mise.toml

```toml
[tools]
node = "22"
pnpm = "latest"
```

### 5.3 package.json scripts

```json
{
  "scripts": {
    "lint:eslint": "eslint --config configs/eslint.config.js fixtures/",
    "lint:oxlint": "oxlint --config configs/.oxlintrc.json fixtures/",
    "lint:oxlint:type-aware": "oxlint --config configs/.oxlintrc.json --type-aware fixtures/",
    "lint:biome": "biome lint --config-path configs/biome.json fixtures/",
    "fmt:prettier:check": "prettier --check --config configs/.prettierrc.json fixtures/",
    "fmt:oxfmt:check": "oxfmt --check fixtures/",
    "fmt:biome:check": "biome format --config-path configs/biome.json fixtures/",
    "bench": "tsx scripts/bench.ts",
    "matrix": "tsx scripts/detect-matrix.ts"
  }
}
```

---

## 6. Fixture 作成規約

### 6.1 各 fixture の必須要素

すべての fixture ディレクトリは以下を必ず含むこと：

1. **README.md**: 何を検証する fixture か、想定される検出ルール、期待される挙動を記述
2. **bad.ts（または bad/ディレクトリ）**: 検出されるべき問題を含むコード
3. **good.ts（または good/ディレクトリ）**: bad の修正版として理想的なコード

### 6.2 README.md テンプレート

各 fixture の README.md は以下のフォーマットに従う：

```markdown
# NN: <fixture 名>

## 検証対象

このコードが何を検証するかを 1〜2 文で記述。

## 該当するルール

| ツール | ルール名                                  | 対応状況        |
| ------ | ----------------------------------------- | --------------- |
| ESLint | `@typescript-eslint/no-floating-promises` | ✅              |
| Oxlint | `typescript/no-floating-promises`         | ✅ (type-aware) |
| Biome  | `noFloatingPromises`                      | ⚠️ 部分対応     |

## 期待される挙動

- bad.ts: <検出されるべきエラー数> 件のエラー
- good.ts: エラー 0 件

## Phoenix V3 文脈での意味

このパターンが Phoenix V3 でなぜ重要か。実際に発生しそうなシナリオ。
```

### 6.3 コード品質規約

- bad.ts は **わざとらしすぎない** こと。実プロジェクトで起きうるリアリティを持たせる
- bad.ts には **コメントで「なぜ問題か」を記載** する
- good.ts は **「ただ動く」ではなく「ベストプラクティス」** に従う
- 1 fixture で検証するルールは **原則 1〜2 個** に絞る（複数の問題を混ぜない）

---

## 7. 初期 fixture リスト

以下 10 件を **この順序で** 実装する。

### Type-aware 系（typescript-eslint の type-aware ルール）

| #   | 名前                     | 主要検証ルール                                                        |
| --- | ------------------------ | --------------------------------------------------------------------- |
| 01  | floating-promises        | `no-floating-promises`                                                |
| 02  | misused-promises         | `no-misused-promises`                                                 |
| 03  | no-unnecessary-condition | `no-unnecessary-condition`                                            |
| 04  | switch-exhaustiveness    | `switch-exhaustiveness-check`                                         |
| 05  | no-unsafe-any            | `no-unsafe-assignment` / `no-unsafe-call` / `no-unsafe-member-access` |

### React / フレームワーク系

| #   | 名前                  | 主要検証ルール                                         |
| --- | --------------------- | ------------------------------------------------------ |
| 06  | react-hooks-deps      | `react-hooks/exhaustive-deps`                          |
| 07  | tanstack-query-misuse | `@tanstack/query/exhaustive-deps`, queryKey 設計の問題 |
| 08  | zustand-store-misuse  | 状態の直接ミューテーション、selector の非効率          |

### マルチファイル / 構造系

| #   | 名前          | 主要検証ルール    |
| --- | ------------- | ----------------- |
| 09  | import-cycles | `import/no-cycle` |

### Formatter 系

| #   | 名前                 | 検証内容                                                                    |
| --- | -------------------- | --------------------------------------------------------------------------- |
| 10  | formatter-edge-cases | 三項演算子のネスト、JSX の改行、長い import 文、template literal の整形差分 |

---

## 8. ベンチマークスクリプト要件

### 8.1 `scripts/bench.ts` の要件

- 各ツール × 各 fixture（bad のみ）の組み合わせで実行
- 以下を計測：
  - 実行時間（hyperfine 相当の精度。最低 3 回実行して中央値）
  - 検出されたエラー / 警告の数
  - 終了ステータス
- 結果を `results/bench-{timestamp}.md` に Markdown 表形式で出力
- 1 行で全ツール比較できるサマリー表を必ず含める

### 8.2 出力フォーマット例

```markdown
# Benchmark Result - 2026-05-04 14:30:00

## Summary

| Fixture              | ESLint    | Oxlint   | Oxlint+TA | Biome    |
| -------------------- | --------- | -------- | --------- | -------- |
| 01-floating-promises | 320ms (3) | 12ms (0) | 45ms (3)  | 28ms (0) |
| 02-misused-promises  | 310ms (2) | 11ms (0) | 42ms (2)  | 27ms (0) |

凡例: 実行時間 (検出件数)

## Detail

<各 fixture ごとの詳細>
```

### 8.3 `scripts/detect-matrix.ts` の要件

- 全 fixture について、各ツールが該当ルールを検出できたかを ✅ / ❌ / ⚠️ で記録
- `results/detect-matrix-{date}.md` に出力
- ツール選定議論の根拠資料として使える形式に

### 8.4 `scripts/format-diff.ts` の要件

- 各フォーマッタを fixture/10-formatter-edge-cases/bad.ts に適用
- 出力結果を並べて比較可能な形式で表示
- 差分が大きい箇所をハイライト

---

## 9. ドキュメント要件

### 9.1 ルート README.md

以下のセクションを含む：

1. プロジェクトの目的
2. ディレクトリ構成
3. 使い方（セットアップ → 実行 → 結果確認）
4. fixture を追加する手順
5. 既知の制約事項

### 9.2 docs/findings.md

ベンチマーク実行後に学んだことを記録する場所。Claude Code はテンプレートだけ用意する。

### 9.3 docs/decision-log.md

「なぜこの設定にしたか」「なぜこのツールを除外したか」を時系列で記録。テンプレートのみ用意。

---

## 10. 完成の定義（Acceptance Criteria）

以下すべてを満たした時点で完成とする：

- [ ] ディレクトリ構成が「4. ディレクトリ構成」と一致している
- [ ] 全ツールがインストールされ、各 lint / fmt スクリプトが単独で動作する
- [ ] 10 個の fixture すべてに README.md / bad / good が揃っている
- [ ] 各 fixture の bad コードを ESLint で実行すると、README に記載のエラー件数と一致する
- [ ] `pnpm bench` が正常終了し、Markdown レポートが `results/` に出力される
- [ ] `pnpm matrix` が検出マトリクスを生成する
- [ ] ルート README.md に使い方が記載されている
- [ ] git init 済みで `.gitignore` に `node_modules/` `results/` が含まれている

---

## 11. 実装の進め方

Claude Code は以下のフェーズに分けて作業すること。**各フェーズ完了後に必ず動作確認** をしてから次に進む。

### Phase 1: 環境セットアップ

- ディレクトリ構成の作成
- package.json / tsconfig.json / mise.toml / DevContainer の設定
- 全ツールのインストール
- 各ツールが「空の fixture」に対して走ることを確認

**完了基準**: `pnpm lint:eslint` などの 6 つのスクリプトすべてがエラーなく実行される（検出 0 件で OK）

### Phase 2: 設定ファイル作成

- `configs/` 以下に各ツールの設定を配置
- ESLint は `recommended-type-checked` をベースに
- Oxlint は `correctness` カテゴリをベースに type-aware を有効化
- Biome は `recommended` をベースに
- Prettier / Oxfmt はデフォルト設定

**完了基準**: 各設定ファイルが構文エラーなく読み込まれる

### Phase 3: Type-aware 系 fixture（01〜05）

- 5 つの fixture を順に作成
- 各 fixture 完成時に ESLint で実行して期待件数を確認
- README.md は必ずテンプレートに従う

**完了基準**: 5 fixture すべてで ESLint の検出件数が README と一致

### Phase 4: フレームワーク系 fixture（06〜08）

- React / TanStack Query / Zustand の現実的な誤用パターン
- 必要に応じて該当ライブラリをインストール（`react`, `@tanstack/react-query`, `zustand`）

**完了基準**: 該当 ESLint プラグインで検出されることを確認

### Phase 5: 構造系 / Formatter 系 fixture（09〜10）

- import-cycles はマルチファイル構成
- formatter-edge-cases は Prettier / Oxfmt / Biome で結果が異なる箇所を意図的に作る

**完了基準**: ツール間で出力差分が確認できる

### Phase 6: ベンチマークスクリプト

- `bench.ts` / `detect-matrix.ts` / `format-diff.ts` を実装
- ローカルで実行して出力を確認

**完了基準**: 「10. 完成の定義」のチェックリストすべてが ✅

### Phase 7: ドキュメント整備

- ルート README.md を完成させる
- docs/ 以下のテンプレートを作成

**完了基準**: 初見の人が README だけを読んで `pnpm bench` まで実行できる

---

## 12. Claude Code への補足指示

### 12.1 守るべきこと

- 各 fixture の bad / good コードは **手動で書く**（テンプレート的な雑なコードを生成しない）
- bad コードには **必ずコメントで問題箇所を説明** する
- 設定ファイルは **公式ドキュメントの最新情報を参照** すること（記憶に頼らない）
- ツールのバージョンは `package.json` に明示的に記録

### 12.2 やらないこと

- pre-commit hook の設定（評価用なので不要）
- CI 設定（ローカル評価が目的）
- 過剰な抽象化（fixture は読みやすさを最優先）
- 良い fixture を「ついでに」リファクタリング（評価対象は固定したい）

### 12.3 不明点があれば

実装中に判断に迷う点があれば、勝手に決めずに **質問を一覧化して確認を求める** こと。特に：

- ツールバージョンが alpha / beta の場合の選択
- 公式ドキュメントとの差分があった場合
- fixture の現実味が薄いと感じた場合

---

## 13. 完成後の活用予定

このリポジトリは完成後、以下に活用する：

- Phoenix V3 の Lint 戦略決定の根拠資料
- SDD steering 文書 `.steering/lint-strategy.md` の参照元
- フロントエンドベストプラクティス Skill の検証材料
- チーム勉強会の教材（「このコードがなぜ問題か」を fixture で見せる）
- Claude Code に「このような bad パターンは書かないで」と指示する際の参考例

将来的には `__lint_fixtures__/` という形で Phoenix V3 本体に組み込み、Lint 設定変更時の回帰テストとして機能させることも検討する。
