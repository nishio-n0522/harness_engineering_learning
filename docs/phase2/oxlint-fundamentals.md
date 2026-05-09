# oxlint 基本ガイド

> **参照時点：2026年5月時点の情報**

oxc ツールチェーンの中で、Phase 2 の主役は **oxlint**（リンター）です。設定ファイルの構造と、ESLint と発想がどう違うかを押さえれば、ハンズオンで詰まる頻度が大幅に下がります。

oxlint は **2025年8月に v1.0 stable** に到達済みで、type-aware 以外のルールについては本番投入できる成熟度に達しています。type-aware については `tsgolint` バックエンド経由で alpha 提供中（[type-aware-limitation.md](./type-aware-limitation.md) 参照）。

## まず動かす最小構成

導入は3ステップで完了します。

```bash
npm i -D oxlint
npx oxlint
```

これだけで、リポジトリ全体に対するリントが走ります。**設定ファイルなしで動く** のが ESLint との最初の違いです。oxlint はデフォルトで **`correctness` カテゴリ** だけを有効化しているので、設定ゼロでも「あからさまなバグ」だけは検出してくれます。

```bash
npx oxlint --help          # オプション一覧
npx oxlint src             # 特定ディレクトリのみ
npx oxlint --fix           # 自動修正可能なものを直す
npx oxlint --quiet         # エラーのみ表示
```

## 設定ファイル：`.oxlintrc.json`

設定を書くなら、リポジトリ直下に `.oxlintrc.json` を置きます。最小例:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "plugins": ["typescript", "react"],
  "rules": {
    "no-unused-vars": "error",
    "no-console": "off"
  }
}
```

`$schema` を指定しておくとエディタで補完が効きます。学習中は必ず入れておくと、何が書けるのかをエディタが教えてくれて圧倒的に楽です。

## 3つの設定軸：`categories` / `plugins` / `rules`

oxlint の設定は基本的に **この3つの軸** だけで成り立っています。これさえ理解すれば設定ファイルは書けます。

### 1. `categories`：ルール群を「目的別」に一括有効化

ESLint は個別ルールを `error` / `warn` / `off` で並べる文化ですが、oxlint は **目的の似たルール群をカテゴリでまとめて扱う** 設計です。

| カテゴリ        | 想定する違反                                       | デフォルト |
| --------------- | -------------------------------------------------- | ---------- |
| `correctness`   | バグそのもの。ほぼ間違いなく実害がある             | `error`    |
| `suspicious`    | バグの可能性が高いが文脈次第                       | `off`      |
| `pedantic`      | 「きれいさ」のためのルール。意見が分かれる         | `off`      |
| `style`         | フォーマット寄り（多くは oxfmt 側の責務）          | `off`      |
| `restriction`   | プロジェクト固有の禁止ルール                       | `off`      |
| `nursery`       | 開発中・実験段階のルール                           | `off`      |

**実運用の指針：**

- 最初は `correctness: error` のみで OK（デフォルトのまま）
- 余裕が出たら `suspicious: warn` を追加
- `pedantic` は組織のスタイルガイドが固まってから検討
- `nursery` は「面白そう」程度で本番投入は避ける

### 2. `plugins`：エコシステム別ルールセットの有効化

ESLint の `plugin:react/recommended` のような感覚で、ドメインごとのルール群を有効化します。組み込みのプラグインは個別 npm install 不要です。

| プラグイン     | 用途                                          |
| -------------- | --------------------------------------------- |
| `typescript`   | TS 固有のルール（`@typescript-eslint` 互換）  |
| `react`        | React 一般ルール                              |
| `react-perf`   | React のパフォーマンス系                      |
| `jsx-a11y`     | アクセシビリティ                              |
| `next`         | Next.js                                       |
| `import`       | `import` 文の整合性                           |
| `node`         | Node.js API の使い方                          |
| `unicorn`      | コードクオリティ系の総合ルール集              |
| `jest` / `vitest` | テストコード向け                           |
| `oxc`          | oxc 独自の拡張ルール                          |

「ESLint で `eslint-plugin-react` を入れていた」という記憶があれば、そのまま `react` を `plugins` に書けば近いものが効きます。

### 3. `rules`：個別ルールの上書き

カテゴリやプラグインで一括有効化したルールを、ファイル単位ではなく **設定全体で個別調整** したいとき使います。

```json
"rules": {
  "no-console": "off",
  "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
  "react/jsx-key": "error"
}
```

ESLint と書き味はそっくりですが、**ルール名にプラグイン prefix（`react/` など）が必要** な点だけ注意してください。

## オーバーライド：パスごとに設定を変える

テストコードだけ console を許す、みたいなことがしたければ `overrides` を使います。

```json
{
  "categories": { "correctness": "error" },
  "rules": { "no-console": "error" },
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.spec.ts"],
      "rules": { "no-console": "off" }
    }
  ]
}
```

## ESLint との違いをまとめると

| 観点                         | ESLint                              | oxlint                                |
| ---------------------------- | ----------------------------------- | ------------------------------------- |
| 安定性                       | 成熟                                | v1.0 stable（2025年8月〜）            |
| 設定ファイル                 | `eslint.config.js`（JS / 動的）     | `.oxlintrc.json`（JSON / 静的）       |
| 設定の表現力                 | JS なので何でも書ける               | JSON なので宣言的だけ                 |
| ルールの一括有効化           | extends                             | categories                            |
| プラグイン導入               | npm install + 設定追記              | 組み込みなら設定追記だけ              |
| 速度                         | 100 ファイルで数秒〜十数秒         | 100 ファイルで数十〜数百ミリ秒        |
| 型情報を使うルール           | 対応（`@typescript-eslint`）        | alpha（tsgolint 経由 / 59→61 ルール） |
| エディタ統合                 | 成熟                                | VSCode 拡張あり、成熟途上             |

「JSON しか書けない」のは制約というより設計判断です。設定が宣言的になることで、**設定ファイルそのものを高速にパースできる**（= 立ち上がりが速い）という利点があります。

## エディタ統合

VSCode に [oxc Extension](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode) を入れると、保存時に lint 結果が表示されます。設定で自動修正もかかるようになります。

```json
// .vscode/settings.json
{
  "oxc.enable": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.oxc": "explicit"
  }
}
```

ESLint と oxlint を **両方有効化** したまま運用するのが移行期間中の現実解です。詳細は [eslint-to-oxlint-migration.md](./eslint-to-oxlint-migration.md) を参照してください。

## CLI でよく使うフラグ

```bash
oxlint --fix                      # 自動修正
oxlint --fix-dry-run              # 修正内容のプレビュー
oxlint --deny-warnings            # warning も exit code 1
oxlint --report-unused-directives # eslint-disable コメントの未使用検出
oxlint -c custom.oxlintrc.json    # 設定ファイルのパス指定
oxlint --tsconfig tsconfig.json   # tsconfig 由来のパス解決
```

CI では基本的に `oxlint --deny-warnings` を使うのが定番です。warn を err として扱うことで、「警告が積もって誰も読まなくなる」事態を防げます。

## 詰まりやすいポイント

- **設定ファイルを書いたのに反映されない**：`.oxlintrc.json` の置き場所が間違っているケースが多い。基本はリポジトリルート
- **ルールが効かない**：プラグイン名（`plugins` への登録）と、`rules` 内のプレフィックスが一致しているか確認
- **「too many errors」で止まる**：デフォルトの上限がある。`--max-warnings` などで調整
- **ESLint と二重で警告が出る**：`eslint-plugin-oxlint` で ESLint 側を抑える（移行ドキュメント参照）

## 次に学ぶこと

- 既存 ESLint プロジェクトへの導入：[eslint-to-oxlint-migration.md](./eslint-to-oxlint-migration.md)
- フォーマッタ側の話：[oxfmt-introduction.md](./oxfmt-introduction.md)
- 型情報を使うルールの現在地（alpha 段階の tsgolint 連携）：[type-aware-limitation.md](./type-aware-limitation.md)

## 参考リンク

- [oxlint 公式ドキュメント](https://oxc.rs/docs/guide/usage/linter.html)
- [oxlint ルール一覧](https://oxc.rs/docs/guide/usage/linter/rules.html)
- [oxlint VSCode 拡張](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode)
