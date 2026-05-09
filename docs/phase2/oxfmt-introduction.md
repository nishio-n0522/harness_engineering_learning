# oxfmt 入門：Beta 段階のフォーマッタとどう向き合うか

> **参照時点：2026年5月時点の情報。oxfmt は 2026年2月に Beta 入りしたばかり**

oxc ツールチェーンの中で、フォーマッタを担うのが **oxfmt** です。Phase 2 のロードマップでは「**検証はしておく価値があるが、本番採用は組織の許容度次第**」という位置付けで触れられています。このドキュメントでは、その「検証する価値」と「採用に踏み切るか否かの判断材料」を整理します。

## 一言で言うと

> **Prettier 互換を目指す Rust 製フォーマッタ。Prettier 比 30 倍の速度（Biome 比でも約 3 倍速）で、Tailwind クラスのソートも内蔵。ただし 2026年2月に Beta 入りしたばかり**

## 立ち位置

oxc におけるフォーマッタの責務は明確で、「整形」だけです。lint と分かれているのは ESLint / Prettier 文化と同じです。

```
oxlint  → コードのバグ・問題を検出
oxfmt   → コードの体裁を整える
```

ESLint には `eslint-plugin-prettier` のようなフォーマッタ統合プラグインもありますが、oxc は **lint と format は別ツールであるべき** という立場で設計されています。これは責務分離の観点では正しい判断で、運用上もシンプルです。

## なぜ「速い」のか

Prettier 比 30 倍という数字の背景は、oxlint と同じ理屈です。

1. Rust ネイティブ
2. oxc-parser が生成した AST を共有（再パース不要）
3. ファイル単位の並列実行

ただし、**Prettier の遅さが開発体験のボトルネックになっているケース** はそれほど多くありません。Prettier は基本的に「保存時に走る」運用なので、十数ファイル分でも秒単位は気になりません。oxfmt の真価が見えるのは、CI で `prettier --check` がモノレポ全体を舐める場面です。

## Tailwind クラスのソート

地味ながら大きい機能として、Tailwind の `class="..."` 内部のクラスを **既定の順序にソートする** 機能が組み込まれています。

これまで Tailwind を使う際は `prettier-plugin-tailwindcss` を別途入れる必要がありましたが、oxfmt では追加プラグイン不要です。

```html
<!-- 入力 -->
<div class="text-white p-4 bg-blue-500 rounded">

<!-- oxfmt 後 -->
<div class="rounded bg-blue-500 p-4 text-white">
```

順序は Tailwind 公式の推奨順に従います。チームで `prettier-plugin-tailwindcss` を運用しているなら、移行時の差分は最小限のはずです。

## Beta であることの意味

これが本ドキュメントの一番大事な部分です。「Beta」は単に「機能不足」を意味しません。**「想定外の出力をする可能性がある」「破壊的変更が入る可能性がある」** という宣言です。

しかも oxfmt が Beta 入りしたのは **2026年2月** で、Beta としての滞在期間がまだ短い点も意識する必要があります（成熟する前の挙動の揺れが見える可能性が高い）。

具体的なリスクとして以下があります。

- **Prettier との出力差分**：互換を「目指す」が完全ではない
  - 改行の入り方、コメントの扱い、JSX の整形などで微妙な差が残る
- **設定オプションの変動**：`.oxfmtrc.json` のスキーマがバージョン間で変わる可能性
- **エディタ拡張の成熟度**：Prettier の VSCode 拡張に比べると安定性で見劣りする時期がある
- **CI での再現性**：マイナーバージョンアップで出力が変わるとレビュー差分が突然発生する

比較対象として、**Biome のフォーマッタは 2023 年から production-ready** であり、本番採用の安心感では大きな差があります。「速さは欲しいが Beta は怖い」という場面では、Biome のフォーマッタを採用する選択肢も検討価値があります。

## 採用判断のフレーム

「使う / 使わない」の二者択一ではなく、**段階的な検証** が現実的です。

### ステージ1：ローカル検証のみ（リスクほぼゼロ）

`oxfmt` をインストールして、`oxfmt --check src/` のように **読み取り専用で** Prettier との差分を観察します。本番のフォーマッタは Prettier のまま。

```bash
npm i -D oxfmt
npx oxfmt --check src
```

### ステージ2：個人のエディタで使ってみる

VSCode 拡張で oxfmt を default formatter にして、個人の開発環境で1〜2週間使ってみます。Prettier に戻したくなるストレスが出るかどうかを観察します。チームの設定（`.vscode/settings.json` のコミット）には触らない。

### ステージ3：CI でドライランを並走させる

CI に Prettier check と oxfmt check の **両方** を走らせ、差分が出たときに人間が判断する形で運用してみます。これで実コミット時の差分を観察できます。

```yaml
# CI 例
- name: Prettier check
  run: npx prettier --check .
- name: oxfmt check (informational)
  run: npx oxfmt --check . || true # ← 失敗を CI に伝播させない
```

### ステージ4：完全置換

ステージ3で「Prettier と oxfmt の差分が無視できる」と判断できれば、Prettier を外して oxfmt 単独に切り替えます。**戻し手順を準備しておく** ことが重要です。

## いつ採用すべきか / 採用すべきでないか

### 採用に向くケース

- **新規プロジェクト**：戻すコストが低い
- **CI のフォーマッタチェックがボトルネック**：Prettier に時間を取られている
- **Tailwind を使っているがプラグインの管理が面倒**：oxfmt なら標準搭載
- **チームが新ツール導入に積極的**：Beta を許容できる文化

### 採用を見送るほうが無難なケース

- **コードレビューに人を多く投入している組織**：些細な整形差分で議論が増える
- **Prettier に強くロックインしている**：`.prettierrc` が複雑、プラグインを多用
- **CI 失敗を取り消すコストが高い**：マイナーアップデートで予期せぬ差分は致命傷
- **そもそも Prettier に困っていない**：投資対効果が薄い

## 設定ファイル：`.oxfmtrc.json`

設定可能なオプションは Prettier より少なめですが、現時点で実用的なものは揃っています。

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Prettier から移行するなら、まず既存の `.prettierrc` の値をそのまま転記してみると差分が最小化されます。

## CLI

```bash
oxfmt              # カレント以下を整形
oxfmt --check      # 整形が必要なファイルがあれば exit 1
oxfmt src lib      # 特定パスのみ
oxfmt --stdin      # stdin を整形して stdout へ
```

`--check` は Prettier と同じ感覚で CI に入れられます。

## lefthook との統合

`pre-commit` で **整形 → ステージ追加** までを1ステップで終わらせるのが定番のパターンです。

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: oxfmt
      run: npx oxfmt {staged_files}
      glob: "*.{js,jsx,ts,tsx,json,md}"
      stage_fixed: true # 整形後に再ステージ
```

`stage_fixed: true` を忘れると「整形はされたがコミットには反映されない」という事故が起きるので注意。

## 終わりに：「速さ」だけで採用しない

oxfmt は確かに速いです。しかし速度の差は、フォーマッタというツールの性質上、**開発体験を劇的に変えるほどの違いではない** ことが多い。

Phase 2 でやるべきは「速さに踊らされず、組織のリスク許容度で判断する」訓練です。「触ってみたら違いを実感した」「本番採用するにはまだ早い」のいずれの結論でも、**判断プロセスを言語化できれば成功** です。

## 参考リンク

- [oxfmt 公式ドキュメント](https://oxc.rs/docs/guide/usage/formatter.html)
- [oxc Roadmap](https://github.com/orgs/oxc-project/projects)
- [Prettier 公式](https://prettier.io/)（互換性比較の元データとして）
- [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
