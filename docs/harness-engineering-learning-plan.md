# ハーネスエンジニアリング学習プラン

開発者生産性を支える基盤ツール群（oxc ツールチェーン / lefthook / 自動テスト）を体系的に習得するためのステップバイステップ学習プランです。想定期間は **4〜6週間**、各フェーズは「概念の理解 → ハンズオン → 既存プロジェクトへの適用」の順で進めます。

## 学習ロードマップ概観

| フェーズ | 内容                      | 目安期間 |
| -------- | ------------------------- | -------- |
| 0        | 前提知識の整理            | 0.5週間  |
| 1        | lefthook（Gitフック基盤） | 1週間    |
| 2        | oxc ツールチェーン        | 1.5週間  |
| 3        | 自動テスト技術スタック    | 2週間    |
| 4        | CI/CD と全体統合          | 1週間    |
| 5        | 応用と発展（任意）        | 随時     |

---

## フェーズ0：前提知識の整理（0.5週間）

**目的：** 各ツールを「なぜ採用するのか」で説明できる土台を作る。

### 押さえる概念

- コード品質ゲートとシフトレフト
- フィードバックループの短縮と CI コスト削減
- テストピラミッド／テストトロフィー

### 推奨インプット

- Martin Fowler "Continuous Integration"
- Google Testing Blog の "Test Pyramid" 周辺記事

### ハンズオン

`.git/hooks/pre-commit` を**生のシェルスクリプトで手書き**して発火させる。lefthook が何を抽象化しているかを体で理解しておく。

---

## フェーズ1：lefthook（1週間）

**目的：** ローカル品質ゲートの実行装置を先に整備する。これがないと後続ツールが「実行されない」リスクが残る。

### 学習ステップ

1. **インストールと最小構成**

   ```bash
   npm i -D lefthook
   npx lefthook install
   ```

   `lefthook.yml` に `echo "hello"` だけのジョブを書き、コミット時に発火することを確認。

2. **コア機能の理解**
   以下のオプションを一つずつ試す。
   - `parallel: true`（並列実行）
   - `{staged_files}` / `{all_files}` / `{push_files}`
   - `glob`（対象ファイルの絞り込み）
   - `stage_fixed`（自動修正後の再ステージ）
   - `exclude_tags` / `skip`

3. **チーム運用パターン**
   - `lefthook-local.yml` によるローカル上書き（git管理外）
   - `remotes` による設定の共有
   - `commit-msg` フックで Conventional Commits を強制

4. **既存プロジェクトへの導入**
   Husky + lint-staged を使っているリポジトリがあれば移行してみる。並列実行・Go単一バイナリ（依存ゼロ）という設計思想の違いが体感できる。

### 到達ゴール

`pre-commit` / `commit-msg` / `pre-push` を設計でき、CI でも `lefthook run pre-commit` を流せる状態。

---

## フェーズ2：oxc ツールチェーン（1.5週間）

**目的：** VoidZero（Vite作者 Evan You の会社）が開発する Rust 製 JS/TS ツールチェーンを使いこなす。パーサ・リンター・フォーマッタ・トランスフォーマー・リゾルバー・ミニファイアが**同じASTを共有**する点がコア設計。

### 学習ステップ

1. **全体像の把握**
   `oxc.rs` 公式ドキュメントを通読。「単一ツールではなく個別パッケージの集合体」である点を理解し、Biome（オールインワン設計）との違いを言語化できるようにする。

2. **oxlint（リンター）**

   ```bash
   npx oxlint
   ```

   `.oxlintrc.json` で以下を設定できるようにする。
   - `categories`（correctness / suspicious / pedantic など）
   - `plugins`（typescript / react / import など）
   - `rules` による個別制御

   ESLint比50〜100倍高速、700以上のESLint互換ルールが売り。

3. **既存 ESLint からの移行戦略**
   - `@oxlint/migrate` で `eslint.config.js` から `.oxlintrc.json` を生成
   - `eslint-plugin-oxlint` で重複ルールを ESLint 側で無効化
   - いきなり全置換せず**ハイブリッド運用での段階移行**が現実的

4. **oxfmt（フォーマッタ・Beta）**
   Prettier互換を目指し、Prettier比30倍高速。Tailwindクラスのソートにも対応。`.oxfmtrc.json` で設定。本番採用は組織の許容度次第だが、検証はしておく価値がある。

5. **lefthook との統合**
   フェーズ1で作った `lefthook.yml` の `pre-commit` に `oxlint {staged_files}` と `oxfmt {staged_files}` を組み込む。ここでハーネスとしての「形」ができる。

6. **限界の理解**
   type-aware ルール（`@typescript-eslint` 由来の型情報を使うルール）への対応は進化中。複雑な型チェックが必要なら `tsc --noEmit` を別途流すか、ESLint併用が必要。

### 到達ゴール

新規プロジェクトに oxlint + oxfmt をセットアップでき、既存プロジェクトに段階移行する戦略をチームに説明できる状態。

---

## フェーズ3：自動テストの技術スタック（2週間）

**目的：** テストピラミッド（ユニット多め → 統合中程度 → E2E少なめ）を意識して各層を積み上げる。

### 第1層：ユニット／コンポーネントテスト（Vitest）

- Vite ネイティブで高速、Jest 互換 API
- 基本構文：`describe` / `it` / `expect`
- モック：`vi.mock` / `vi.spyOn` / `vi.useFakeTimers` の使い分け
- `@testing-library/react`（または vue / svelte）でユーザー視点のテスト
  - **`getByRole` を第一選択にする原則**を体に染み込ませる
- カバレッジ：`vitest run --coverage`（v8 provider）
  - カバレッジ率は**目的ではなく診断指標**として扱う

### 第2層：API モッキングと統合テスト（MSW）

- Mock Service Worker でネットワーク層をモック
- `http.get` / `http.post` のハンドラ定義
- `server.use()` でテストごとの上書き
- Node 環境とブラウザ環境の両対応
- **発想の転換：** 実装をモックするのではなく、ネットワーク境界をモックする

### 第3層：E2E テスト（Playwright）

- 基本：`page.goto` / `locator` / `expect`
- `auto-waiting` の理解と Trace Viewer によるデバッグ
- Page Object Model パターン
- 認証状態の使い回し（`storageState`）
- 並列実行とシャーディング
- **発展：**
  - Visual regression（`toHaveScreenshot`）
  - アクセシビリティチェック（`@axe-core/playwright`）

### 横断トピック

- **テストデータ設計：** ビルダーパターン、Factory、`faker`、フィクスチャ設計
- **フレーキーテスト対策：** リトライ、決定論的タイマー、`page.waitFor*` の正しい使い方
- **戦略の意思決定のインプット：**
  - Kent C. Dodds "Testing Trophy"
  - Google の "Small / Medium / Large Tests" 分類

### 到達ゴール

ユニット／統合／E2E の責務を切り分けて設計でき、フレーキーテストの原因を切り分けて直せる状態。

---

## フェーズ4：CI/CD と全体統合（1週間）

**目的：** ここまでで作ったハーネスを GitHub Actions（または GitLab CI）に組み込み、チーム全体で回る状態にする。

### 設計項目

1. **ワークフロー構成**
   PRトリガで以下を実行、並列化可能な部分は並列化。

   ```
   lint (oxlint)
     → format check (oxfmt --check)
     → typecheck (tsc)
     → unit test (vitest)
     → build
     → E2E (playwright)
   ```

2. **キャッシュ戦略**
   `actions/cache` で以下を再利用。
   - `node_modules`
   - Playwright ブラウザバイナリ
   - Vitest キャッシュ

3. **lefthook との二重実行設計**
   ローカルで `oxlint` が走るので、CI ではフル実行するか差分に絞るかをチームで決める。

4. **テスト並列化**
   - Playwright のシャーディング
   - Vitest の `--shard`

5. **レポーティング**
   - JUnit XML 出力 → GitHub Actions の test summary
   - カバレッジを Codecov や PR コメントへ連携

6. **ブランチプロテクション**
   必須チェックの設定、`merge queue` の検討。

---

## フェーズ5：応用と発展（任意）

ハーネスエンジニア視点での発展トピック。

- **Renovate / Dependabot** によるツールチェーン自動更新（oxc は活発に開発されているため重要）
- **モノレポ最適化：** Turborepo や Nx の `affected` 概念で、変更されたパッケージだけテスト／lint
- **lint オーケストレーター比較：** Trunk Check、Mega-linter など
- **バンドルサイズ回帰検知：** Bundlesize、size-limit
- **視覚的回帰テスト：** Storybook + Chromatic で UI コンポーネント
- **効果測定：** DORA メトリクス（Lead Time、Deployment Frequency など）でビフォーアフターを取る

---

## 進め方のコツ

- **サンドボックスリポジトリを一つ持ち、そこに積み上げる。** フェーズ1〜4を一つのリポジトリで完成させれば、それがそのままチームへの提案テンプレートになる。
- **詰まりやすいポイントを意識：**
  - oxlint と既存 ESLint の共存設定
  - Playwright の auto-wait を信頼できず `waitForTimeout` を撒いてしまう問題
- **各フェーズでアウトプットを残す。** 自分用の `NOTES.md` にハマりどころを書いておくと、後でチーム向けドキュメントに転用しやすい。

---

## 参考リンク

- [oxc 公式サイト](https://oxc.rs/)
- [lefthook リポジトリ](https://github.com/evilmartians/lefthook)
- [Vitest 公式ドキュメント](https://vitest.dev/)
- [Playwright 公式ドキュメント](https://playwright.dev/)
- [Mock Service Worker](https://mswjs.io/)
- [Testing Library](https://testing-library.com/)
