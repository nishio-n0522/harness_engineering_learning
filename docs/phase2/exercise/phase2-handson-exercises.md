# Phase 2 ハンズオン課題：oxc ツールチェーン

> **参照時点：2026年5月時点の情報**

ハーネスエンジニアリング学習プランの **Phase 2（oxc ツールチェーン）** に対応するハンズオン課題集です。Phase 1 で整備した lefthook の上に、oxlint と oxfmt を **正しく** 載せていきます。「動かせる」ではなく「**なぜ動かしているか説明できる**」状態をゴールにしてください。

2026年5月時点の前提として、**oxlint v1.0 は stable**、**type-aware は tsgolint 経由で alpha**、**oxfmt は 2026年2月にBeta入り**、**競合の Biome v2 は stable で type-aware 対応済み** という状況です。Exercise 5 では Biome との比較も体験します。

## 全体の流れ

| 問題  | 難易度 | 所要時間    | 学びのフォーカス                                          |
| ----- | ------ | ----------- | --------------------------------------------------------- |
| 問題1 | ★☆☆    | 1〜2時間    | oxlint の最小構成、設定3軸の理解                          |
| 問題2 | ★★☆    | 2〜3時間    | ESLint からのハイブリッド移行                             |
| 問題3 | ★★☆    | 1〜2時間    | oxfmt の検証、Prettier との差分観察                       |
| 問題4 | ★★★    | 2〜3時間    | lefthook + oxc の統合、ハーネスとしての完成               |
| 問題5 | ★★☆    | 1.5〜2時間  | type-aware の「現在地」を tsgolint と Biome v2 で実演比較 |

合計で2日くらいの分量です。先に概念ドキュメント群（`oxc-toolchain-overview.md` ほか）に目を通しておくと、ハンズオン中に迷子になりにくいです。

---

## 問題1：oxlint の最小構成と設定3軸の理解

**難易度：★☆☆**

### ゴール

新しいサンドボックスプロジェクトに oxlint を入れて、設定の3軸（`categories` / `plugins` / `rules`）を**自分の手で動かす**。設定を変えたら警告がどう変わるかを観察する。

### 要件

#### Step 1：プロジェクト準備

1. 任意のディレクトリ（例：`docs/phase2/exercise/1/`）に移動
2. `npm init -y` で `package.json` を作成
3. `npm i -D oxlint typescript` でインストール

#### Step 2：意図的にバグを含む TS ファイルを書く

`src/sample.ts` を作り、以下のような「いかにも lint で引っかかる」コードを入れる:

```ts
const unused = 42;

export function bad(value: any) {
  if (value == null) {
    return value;
  }
  let x;
  x = value.toString();
  console.log(x);
}
```

#### Step 3：設定なしで oxlint を実行

```bash
npx oxlint src
```

何が検出され、何が検出されないかを観察する。

#### Step 4：`.oxlintrc.json` を書いて挙動を変える

以下を**1ステップずつ**試して、挙動を比較する。

1. `categories` だけを変える
   ```json
   { "categories": { "correctness": "error", "suspicious": "warn" } }
   ```
2. `plugins` を追加する
   ```json
   { "categories": { "correctness": "error" }, "plugins": ["typescript"] }
   ```
3. `rules` で個別ルールを on/off する
   ```json
   {
     "categories": { "correctness": "error" },
     "plugins": ["typescript"],
     "rules": { "no-console": "error", "no-unused-vars": "warn" }
   }
   ```

各ステップで `npx oxlint src` を実行し、**警告メッセージがどう変わったか** を `NOTES.md` にメモする。

### 学べること

- oxlint の設定は基本3軸（categories / plugins / rules）だけで成り立っている
- 「設定なしでも動く」ことの意味（デフォルトで `correctness` が `error`）
- カテゴリで一括変更したあと、個別ルールで微調整する流れ
- ESLint と比べて設定変更後の起動が速い感覚

### 発展課題

- `overrides` を使って、テストファイルだけ `no-console: off` にしてみる
- `--fix` で自動修正できるルールと、できないルールを観察する
- `oxlint --help` のフラグを一通り試して、CI で使いそうなものを書き出す
- 同じコードに対して ESLint をインストールして実行時間を比較する（**ストップウォッチでよい**、CI ベンチマークでなくてよい）

---

## 問題2：既存 ESLint プロジェクトへのハイブリッド導入

**難易度：★★☆**

### ゴール

ESLint が既に入っているプロジェクトに対して、oxlint を **共存** させる形で導入する。`@oxlint/migrate` と `eslint-plugin-oxlint` の両方を体験し、ハイブリッド運用がどう成り立つかを理解する。

### 前提

ESLint が入っている既存プロジェクトを用意する。学習用なら以下のいずれか:

- 自分が普段触っているリポジトリ（書き戻すならブランチを切る）
- `npm create vite@latest my-eslint-app -- --template react-ts` で作った新規プロジェクト（vite テンプレートに ESLint が同梱されている）
- `docs/phase2/exercise/2/` に小さな ESLint 設定済みプロジェクトを自作する

### 要件

#### Step 1：ベースラインの記録

1. 既存の `npm run lint`（または `eslint .`）の所要時間を記録（`time` コマンドでよい）
2. 検出されている警告・エラーの数を記録
3. これがハイブリッド導入後の比較対象になる

#### Step 2：oxlint を追加して並走させる

```bash
npm i -D oxlint
npx oxlint
```

設定なしで動かしてみる。ESLint と何が同じで何が違うかを観察。

#### Step 3：`@oxlint/migrate` で `.oxlintrc.json` を生成

```bash
npx @oxlint/migrate
```

生成された `.oxlintrc.json` を読み、以下を確認する:

- どのルールが移行されたか
- どのルールがスキップされたか（コメントで残ることがある）
- 自分のプロジェクトの ESLint 設定と比べて、何が抜けているか

**この時点で `.oxlintrc.json` を即コミットしないこと**。草案として手で見直す。

#### Step 4：`eslint-plugin-oxlint` で重複を消す

```bash
npm i -D eslint-plugin-oxlint
```

`eslint.config.js` の **末尾** に以下を追加:

```js
import oxlint from 'eslint-plugin-oxlint';

export default [
  // ... 既存の設定 ...
  ...oxlint.configs['flat/recommended'],
];
```

`oxlint` と `eslint` を両方走らせて、二重警告が消えていることを確認する。

#### Step 5：所要時間を再測定する

ESLint 単独 vs (oxlint + ESLint 並列) の合計時間を比較。並列実行は `npm-run-all` などを使うか、シェルの `&` で並列に走らせる。

```bash
# 並列実行例
npx oxlint & npx eslint . & wait
```

### 検証シナリオ

1. **二重警告が消えていること**：oxlint で出る警告が ESLint で重複していない
2. **type-aware ルールは ESLint 側で生き残っていること**：`@typescript-eslint/no-floating-promises` などが ESLint で動いている
3. **lint 全体の時間が短くなっていること**（または少なくとも遅くなっていないこと）

### 学べること

- ハイブリッド運用は **「ESLint を消す」ではなく「役割を分ける」**
- `@oxlint/migrate` の出力は完成品ではなく草案
- `eslint-plugin-oxlint` を **配列の末尾に置く** ことの意味
- 並列実行することで合計時間が ESLint 単独より速くなる現象

### 発展課題

- ESLint 側で「型情報必須ルールだけ残す」最小設定にトライする（`tseslint.configs.recommendedTypeChecked` のみなど）
- `npm run lint` を `oxlint + eslint` 並列実行に書き換える
- 移行進捗の表（[migration ドキュメント](../eslint-to-oxlint-migration.md) 末尾）を自分のプロジェクト向けに作る

---

## 問題3：oxfmt の検証と Prettier との差分観察

**難易度：★★☆**

### ゴール

oxfmt を **読み取り専用** で動かし、Prettier との差分を観察する。本番採用するかどうかの判断材料を自分の言葉で整理する。

### 要件

#### Step 1：Prettier 設定済みのプロジェクトを用意する

問題2で使ったプロジェクトでも、別途用意してもよい。`.prettierrc` がある状態がスタート。

#### Step 2：oxfmt を入れて check モードで実行

```bash
npm i -D oxfmt
npx oxfmt --check src
```

`--check` は読み取り専用で、整形が必要なファイルがあれば exit 1 を返すだけ。**実ファイルは変更されない**ので安心。

#### Step 3：実際に書き換えて Prettier との diff を取る

別ブランチを切って oxfmt を本気モードで走らせ、Prettier の出力と比較:

```bash
git switch -c experiment/oxfmt
npx prettier --write src
git stash # Prettier の結果を一旦退避
npx oxfmt src
git diff stash@{0} # Prettier 結果と oxfmt 結果の diff
```

または、Prettier を走らせた状態でコミットして、その後 oxfmt を走らせて `git diff` を見る、でも OK。

#### Step 4：差分を3つに分類する

`NOTES.md` に書き出す:

| 分類                   | 例                                          | 採用判断への影響       |
| ---------------------- | ------------------------------------------- | ---------------------- |
| 出力が一致             | 大半のシンプルなコード                      | 問題なし               |
| 軽微な差分             | 改行位置、コメントの扱い                    | レビューで議論が増える |
| 受け入れがたい差分     | JSX のインデント、特殊な構文                | 採用見送りの根拠になる |

#### Step 5：Tailwind クラスソートを試す

Tailwind を使っているなら、以下のような HTML/JSX を用意して oxfmt をかける:

```jsx
<div className="text-white p-4 bg-blue-500 rounded shadow-lg" />
```

`prettier-plugin-tailwindcss` の出力と比較する。

### 学べること

- oxfmt は Beta であり、Prettier との出力差分が **ゼロではない** こと
- 「速いから採用」では決められないこと（差分量と組織の許容度の問題）
- Tailwind プラグインが標準搭載されている利便性
- `--check` で読み取り専用検証する運用パターン

### 発展課題

- `.oxfmtrc.json` を書いて `printWidth` などを変えて挙動を観察
- CI で「Prettier check は必須、oxfmt check は informational（失敗を許容）」のドライラン構成を組む
- 自分のチームに oxfmt 採用を提案するなら、どんな段取りで進めるかを書く

---

## 問題4：lefthook と oxc の統合（ハーネスとしての形を作る）

**難易度：★★★**

### ゴール

Phase 1 で作った `lefthook.yml` に、oxlint と oxfmt を組み込む。**「コミット時に自動的に lint と format がかかる」** 状態を作り、Phase 2 のロードマップが言う「**ハーネスとしての形ができる**」を実現する。

### 前提

このリポジトリ（`harness_engineering_learning`）の `lefthook.yml` を編集する。Phase 1 のシェルスクリプト群はそのまま残す。

### 要件

#### Step 1：oxlint と oxfmt をリポジトリにインストール

```bash
npm i -D oxlint oxfmt
```

#### Step 2：最小設定を書く

リポジトリルートに以下を作成:

`.oxlintrc.json`:
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "plugins": ["typescript", "react"]
}
```

`.oxfmtrc.json`:
```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all"
}
```

#### Step 3：`lefthook.yml` を拡張する

既存の `pre-commit` ジョブを残しつつ、oxc 系のジョブを追加する。要件:

- `oxlint` を `*.{js,jsx,ts,tsx}` に絞って実行
- `oxfmt` を `*.{js,jsx,ts,tsx,json,md}` に絞って実行し、整形後に再ステージ（`stage_fixed: true`）
- 既存の Phase 1 ジョブと **並列で** 動かす

設定例（**完成形を写すのではなく、自分で書いてから比較する** こと）:

```yaml
pre-commit:
  parallel: true
  jobs:
    # Phase 1 で作ったジョブ
    - name: check-shebang
      run: ./docs/phase1/exercise/3/scripts/check-shebang.sh {staged_files}
      glob: "*.sh"
    - name: check-capital-extension
      run: ./docs/phase1/exercise/3/scripts/check-capital-extension.sh {staged_files}

    # Phase 2 で追加するジョブ
    - name: oxlint
      run: npx oxlint {staged_files}
      glob: "*.{js,jsx,ts,tsx}"
    - name: oxfmt
      run: npx oxfmt {staged_files}
      glob: "*.{js,jsx,ts,tsx,json,md}"
      stage_fixed: true
```

#### Step 4：動作確認

以下のシナリオで挙動を確認する。

1. **整形が必要な TS ファイルをステージしてコミット**：oxfmt が走り、自動整形されたファイルが再ステージされてコミットに含まれる
2. **lint エラーのある TS ファイルをコミット**：oxlint が止める
3. **`.sh` ファイルだけのコミット**：oxlint と oxfmt はスキップされる（`glob` の効果）
4. **複数ファイルを一度にステージ**：`parallel: true` で oxlint と oxfmt が並行実行されている

#### Step 5：CI 用のスクリプトを書く

`package.json` に以下のスクリプトを追加:

```json
"scripts": {
  "lint": "oxlint",
  "format:check": "oxfmt --check .",
  "harness:check": "lefthook run pre-commit --all-files"
}
```

`npm run harness:check` でローカルと CI で同じ品質ゲートを通せる状態にする。

### 検証シナリオ

1. lint エラーがあるファイルをコミット → lefthook が oxlint で止める
2. 整形が必要なファイルをコミット → oxfmt が整形して再ステージ → コミット成功
3. `npm run harness:check` を実行 → リポジトリ全体に対して lint と format check が走る
4. CI（GitHub Actions）でも `npm run harness:check` を呼ぶ Workflow を書く（既存 Workflow に追加）

### 学べること

- lefthook の `glob` と `parallel: true` が組み合わさったときの挙動
- `stage_fixed: true` が **整形ツールには必須** であること
- ローカルと CI で同じコマンドを使う設計の利点（`lefthook run pre-commit`）
- ハーネスエンジニアリングが目指す「**実行されないと意味がない**」を回避する仕組み

### 発展課題

- `pre-push` で型チェック（`tsc --noEmit`）を走らせる
- `commit-msg` フックで Conventional Commits の形式を強制（Phase 1 の流用）
- `lefthook-local.yml` を `.gitignore` に追加し、自分だけの一時的な skip 設定を試す
- CI で **差分のあるファイルだけ** lint する設定を考える（`{push_files}` の活用）

---

## 問題5：type-aware の「現在地」を 4 ツールで実演比較する

**難易度：★★☆**

### ゴール

oxlint が **何を見ていないか / どこまで見えるようになったか** を、4 つのツール（oxlint / oxlint + tsgolint / ESLint + `@typescript-eslint` / Biome v2）の挙動差として **自分のターミナルで** 確認する。これによって「2026年5月時点で、どの構成を選ぶべきか」を抽象論ではなく具体例で判断できるようになる。

### 前提

- TypeScript 7.0+ が必要（tsgolint の動作要件）
- Go ランタイムが入っていること（tsgolint バイナリの実行用）
- 各ツールのインストールに数分かかる

### 要件

#### Step 1：問題のあるコードを用意

`docs/phase2/exercise/5/floating-promises.ts` を作成:

```ts
async function fetchData() {
  return fetch('/api/data');
}

function handleClick() {
  // BUG: Promise を握り潰している
  fetchData();
}

async function main() {
  // BUG: await 忘れ
  Promise.resolve('oops');
  fetchData();

  // OK: ちゃんと await している
  await fetchData();
}

main();
```

#### Step 2：oxlint（type-aware OFF）で実行

```bash
npx oxlint docs/phase2/exercise/5/floating-promises.ts
```

何も検出されないか、検出されても correctness レベルではないことを確認する。これが「**AST だけでは見えない世界**」の出発点。

#### Step 3：oxlint + tsgolint（alpha）で実行

`tsgolint` を有効化して再実行する。

```bash
npx oxlint --type-aware docs/phase2/exercise/5/floating-promises.ts
```

`no-floating-promises` 相当のエラーが出ることを確認する。**実行時間も計測** する（`time` コマンドでよい）。tsgolint 起動のオーバーヘッドが気になる場合はそれもメモ。

うまく動かない場合は以下を確認:

- TypeScript のバージョンが 7.0+ か
- tsgolint バイナリが解決できているか（インストールメッセージを確認）
- メモリ不足で OOM になっていないか（小さいプロジェクトでは問題になりにくい）

#### Step 4：ESLint + `@typescript-eslint` で実行

別途、最小構成の ESLint を用意する。`@typescript-eslint/no-floating-promises` を有効化:

```js
// eslint.config.js
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
];
```

```bash
npx eslint docs/phase2/exercise/5/floating-promises.ts
```

`no-floating-promises` のエラーが出ることと、**実行時間** を計測する。

#### Step 5：Biome v2 で実行

```bash
npm i -D @biomejs/biome
npx @biomejs/biome lint docs/phase2/exercise/5/floating-promises.ts
```

Biome v2 は **TypeScript コンパイラなしで type-aware lint を動かす独自型推論** を持っているのが売り。`noFloatingPromises` 相当が検出されることと、実行時間を確認する。

#### Step 6：4 ツールの比較表を作る

`NOTES.md` に以下のような表を作る:

| ツール                    | 検出 | 実行時間 | セットアップの手間 | ステージ      |
| ------------------------- | ---- | -------- | ------------------ | ------------- |
| oxlint                    |      |          |                    | stable        |
| oxlint + tsgolint         |      |          |                    | alpha         |
| ESLint + @typescript-eslint |    |          |                    | stable        |
| Biome v2                  |      |          |                    | stable        |

数字は環境依存なので相対比較で OK。

#### Step 7：他の type-aware ルールも試す

以下のルールについて、4 ツールの挙動を比較する:

- `@typescript-eslint/no-misused-promises` / Biome の `noMisusedPromises`
- `@typescript-eslint/await-thenable` / Biome の `useAwait`
- `@typescript-eslint/no-unnecessary-type-assertion`

oxlint + tsgolint でカバーされている **59/61** に含まれるルールと、含まれない 2 ルール（公式ドキュメントを参照）の差を観察する。

#### Step 8：判断の言語化

最後に、以下の問いに自分の言葉で答える（`NOTES.md` に書く）。

1. 自分が新規プロジェクトを始めるなら、4 つのうちどれを選ぶか？理由は？
2. 既存 ESLint プロジェクトなら、どこを残してどこを oxlint / tsgolint / Biome に移すか？
3. tsgolint が stable に到達したら、運用構成はどう変えるか？
4. 「速度」と「ステージの安定性」のどちらを優先するか、自分の組織の文脈でどう答えるか？

### 学べること

- type-aware ルールが AST だけでは判定できない理由が **コードレベルで** 分かる
- 2026年現在、type-aware lint は **「ESLint だけ」の独占ではなくなった** ことを実感する
- oxlint + tsgolint と Biome v2 のアプローチの違い（Go バックエンド委譲 vs 独自型推論）を体感する
- 「ESLint を消せるか」は速度・ステージ・互換性ルール資産のバランスで決まる
- ハイブリッド運用が「妥協」ではなく「過渡期の合理的選択」であること

### 発展課題

- `tsc --strict` を有効にしたとき、type-aware ルールのうちどれが「型エラーで自動的に検出される」かを調べる
- oxc の Roadmap と tsgolint の Issue を読んで、stable 化の見通しを把握する
- 大きな OSS リポジトリ（数千ファイル規模）に対して、4 ツールの実行時間を比較する
- メモリ消費を `time -v`（GNU）や macOS の Activity Monitor で観察し、tsgolint のメモリプロファイルを掴む

---

## 進め方の提案

問題1〜5 を順番に進めると、以下のような学習体験になります。

**問題1で得られる感覚：**

> 「oxlint の設定は3軸だけ。これは思っていたよりシンプルだ」

**問題2で得られる感覚：**

> 「ESLint を消そうと思っていたが、共存させるのが正解なんだ。`eslint-plugin-oxlint` の置き場所が大事」

**問題3で得られる感覚：**

> 「oxfmt は確かに速いが、Prettier から乗り換えるかは別問題。Beta の意味を実感する」

**問題4で得られる感覚：**

> 「lefthook + oxlint + oxfmt が組み合わさって、ハーネスとして機能し始めた。コミットするだけで品質ゲートが効く」

**問題5で得られる感覚：**

> 「type-aware は AST だけでは見えない。でも 2026年5月時点では tsgolint や Biome v2 の選択肢が増えていて、『ESLint しかない』時代は終わりかけている」

この体験の積み重ねが、Phase 2 のゴールである「**新規プロジェクトに oxlint + oxfmt をセットアップでき、既存プロジェクトに段階移行する戦略をチームに説明できる**」状態に繋がります。

## 詰まったときのヒント

- **`.oxlintrc.json` の補完が効かない** → `$schema` を入れているか確認。VSCode を再起動してみる
- **設定を変えても結果が変わらない** → 設定ファイルの置き場所を確認。リポジトリルートにあるか
- **`@oxlint/migrate` の出力が空に近い** → 既存の ESLint 設定が flat config 形式か、legacy 形式かで挙動が変わる
- **`eslint-plugin-oxlint` で警告が消えない** → `eslint.config.js` の **末尾** に置けているか確認
- **lefthook で oxlint が走らない** → `glob` の指定ミス。`*.{ts,tsx}` を `*.ts,tsx` と書いていないか
- **oxfmt の挙動が予想と違う** → Beta なので、まず `--check` で読み取り専用にして観察する

## 参考資料

- [oxc 公式ドキュメント](https://oxc.rs/)
- [oxlint Migration Guide](https://oxc.rs/docs/guide/usage/linter/migrate.html)
- [eslint-plugin-oxlint](https://github.com/oxc-project/eslint-plugin-oxlint)
- [oxfmt 公式ドキュメント](https://oxc.rs/docs/guide/usage/formatter.html)
- [typescript-eslint: Linting with Type Information](https://typescript-eslint.io/getting-started/typed-linting/)
- [lefthook 公式ドキュメント](https://lefthook.dev/)
