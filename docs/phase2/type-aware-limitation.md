# oxlint と type-aware ルール：2026年の現在地

> **参照時点：2026年5月時点の情報**

oxlint の話をすると必ず出てくるのが「**type-aware ルール（型情報を使うルール）への対応**」です。**「対応していない」という時代は終わりつつあり**、2026年5月時点では `tsgolint` バックエンド経由で alpha 提供中（59/61 typescript-eslint ルール対応）に進化しています。ただし alpha なりの制約があり、本番投入の判断は慎重に行う必要があります。

このドキュメントでは、**「対応していない」と「stable で誰でも安心して使える」の間にあるグレーゾーン** を整理します。

## type-aware ルールとは何か

「**型情報を参照しないと判定できない lint ルール**」のことです。代表例：

| ルール                                            | 何を見ているか                                    |
| ------------------------------------------------- | ------------------------------------------------- |
| `@typescript-eslint/no-floating-promises`         | Promise を await し忘れていないか                 |
| `@typescript-eslint/no-misused-promises`          | `if (asyncFn())` のような誤用                     |
| `@typescript-eslint/await-thenable`               | `await` の対象が本当に Promise か                 |
| `@typescript-eslint/no-unnecessary-type-assertion` | `as Foo` が冗長になっていないか                  |
| `@typescript-eslint/strict-boolean-expressions`   | `if (x)` の `x` が boolean か                     |

これらは **TypeScript コンパイラの型推論結果を読んで** 判定します。AST だけでは「この関数が Promise を返すか」が分からないからです。

## なぜ AST だけでは足りないのか

具体例で考えます。

```ts
// fileA.ts
export function fetchUser() {
  return fetch('/api/user'); // Promise<Response> を返す
}

// fileB.ts
import { fetchUser } from './fileA';

function handleClick() {
  fetchUser(); // ← Promise を捨てている。await が要る
}
```

`fileB.ts` の AST だけ見ると、`fetchUser()` は単なる関数呼び出しです。**「この関数が Promise を返す」という情報は `fileA.ts` 側にしかない** ので、TypeScript の型チェッカーが両方のファイルを統合的に解析しないと判定できません。

ESLint の `@typescript-eslint` は、内部で TypeScript Compiler API を呼び出してこの解析を行っています。**遅さの主因はここ** で、引き換えに型情報を使った精緻なルールが書けます。

## 2026年5月時点の oxlint の対応状況

ここが従来のドキュメントと大きく違う部分です。

### tsgolint：oxlint の type-aware バックエンド

oxc プロジェクトは「Rust 側で TypeScript の型推論を完全に再実装する」ではなく、**[tsgolint](https://github.com/oxc-project/tsgolint)（Go 製、`typescript-go` を内部で利用）に型情報処理を委譲する** という設計を採用しました。

```
oxlint（Rust） ─── 構文ルール、設定、ファイル走査
       │
       └─→ tsgolint（Go） ── TypeScript型システム、type-awareルール
```

oxlint は「フロントエンド」、tsgolint は「型情報バックエンド」という役割分担です。利用者から見ると `oxlint --type-aware` のように単一コマンドで使えます。

### サポート状況

- **ステージ：Alpha**（2026年5月時点）
- **ルール数：59 / 61**（typescript-eslint の type-aware ルール中）
- **必須要件：TypeScript 7.0+**
- **メモリ消費：大規模リポジトリで顕著に増える**
- **インストール：oxlint に加えて tsgolint バイナリが必要**

`oxc-project/tsgolint` リポジトリで開発が進んでおり、stable 化を待つ間、**実験用途〜限定的本番投入** までは可能な状態に到達しています。

## 競合の状況：Biome v2 はどうしているか

選定判断に直結する重要事実として、**Biome v2（Biotype）は TypeScript コンパイラなしで type-aware lint を動かす独自型推論エンジンを stable で提供** しています。

| 観点               | oxlint + tsgolint                  | Biome v2                     |
| ------------------ | ---------------------------------- | ---------------------------- |
| ステージ           | Alpha                              | Stable                       |
| 型情報の取得方法   | tsgolint（Go / typescript-go 経由）| Biome 独自の型推論エンジン   |
| TS互換ルール       | 59 / 61                            | 約 75〜85%                   |
| TypeScript 依存    | TS 7.0+ 必須                       | 不要（独自実装）             |
| 別プロセス         | tsgolint バイナリが必要            | 単一バイナリ                 |

「**新規プロジェクトで type-aware lint を最優先したい**」だけなら、現時点では Biome v2 のほうが滑らかです。oxlint + tsgolint は「将来的に oxlint で完結したい・速度を最優先したい」場合の選択肢として位置付けるのが現実的です。

## 運用パターン：3 つの選択肢

「型情報必須ルールが必要」と「lint を高速化したい」を両立させる選択肢は3つあります。

### 選択肢A：ESLint を「型情報ルール専用」として残す（保守的）

最もシンプルで、長らく Phase 2 のメイン戦略だった構成です。stable な実績がある。

- oxlint：構文レベルで判定できるルールを高速に処理
- ESLint：型情報を使うルールだけを担当

```js
// eslint.config.js
import tseslint from 'typescript-eslint';
import oxlint from 'eslint-plugin-oxlint';

export default [
  ...tseslint.configs.recommendedTypeChecked, // ← 型情報ルールだけ
  ...oxlint.configs['flat/recommended'],      // ← 重複ルールは off
];
```

**向く状況**：本番運用の安定性を最優先する、停止リスクを取れない金融・医療など。

### 選択肢B：oxlint + tsgolint で alpha を試す（先進的）

```bash
# tsgolint を有効化したリンティング
npx oxlint --type-aware
```

**メリット**：oxlint 1本（に tsgolint をぶら下げる）で完結する。Rust + Go の組み合わせで ESLint より大幅に速い。

**デメリット**：
- alpha なので破壊的変更が入る可能性
- TypeScript 7.0+ が必須
- メモリ使用量が大きい
- 大規模 monorepo で挙動が不安定なことがある
- エディタ統合の成熟度はまだ低い

**向く状況**：実験的なプロジェクト、サンドボックス、ベンチマーク取得目的、あるいは速度がクリティカルでフォローを払える組織。

### 選択肢C：Biome v2 に乗り換える

oxlint + ESLint をまとめて捨てて、Biome v2 の type-aware lint に寄せる選択肢です。**新規プロジェクト** ではこれが最も滑らか。

**メリット**：単一バイナリ、type-aware が stable、formatter も stable、ゼロコンフィグ。

**デメリット**：ESLint 互換ルール群（700+）の資産を捨てることになる。oxc エコシステムの恩恵（Vite 8 内蔵の oxc-parser など）から外れる。

### 選択肢D：型チェックは `tsc --noEmit` に寄せる（補完的）

「Promise の握り潰し」は、`@typescript-eslint/no-floating-promises` でなくても、**コーディング規約として `await` を強制** すれば概ね防げます。完璧ではありませんが、運用ルールでカバーできる類の問題も少なくありません。

CI に `tsc --noEmit` を入れておけば、型エラーは確実に検出されます。lint で見たい範囲を絞り込み、それ以外は型システムに任せるという発想です。これは A〜C のどれと組み合わせても有効。

## 「型情報ルールが要らない」プロジェクトの判別

すべてのプロジェクトに型情報ルールが必須というわけではありません。以下に当てはまるなら、ESLint も tsgolint も導入せず、oxlint 単独で回せる可能性があります。

- **JS のみ、または TS の利用が緩い**：`any` を許容している、型チェック自体が弱い
- **Promise の扱いが少ない**：同期処理中心
- **チームの TypeScript 練度が高い**：規約レベルで型情報依存ルールの目的を達成している
- **`tsc --strict` を厳格に運用している**：型エラーで止まる前提なので lint で重ねる必要が薄い

逆に、以下に当てはまるなら何かしらの type-aware lint が要ります。

- **非同期処理が多い**：Promise の握り潰しは重大バグになる
- **TypeScript 初学者を含むチーム**：ルールによる教育効果が必要
- **金融・医療など事故許容度が低いドメイン**：lint のセーフティネットを厚くする価値がある

## 動作の見極め方（実演）

ハンズオンで自分で確認するための小さな実験を載せておきます。

```ts
// experiment.ts
async function bad() {
  Promise.resolve('oops'); // ← await 忘れ
  fetch('/api'); // ← 同上
}
```

このコードに対して:

```bash
# 1. oxlint（type-aware なし）：警告は出ない
npx oxlint experiment.ts

# 2. oxlint + tsgolint（alpha）：no-floating-promises を検出
npx oxlint --type-aware experiment.ts

# 3. ESLint + @typescript-eslint：no-floating-promises を検出
npx eslint experiment.ts

# 4. Biome v2：noFloatingPromises を検出
npx @biomejs/biome lint experiment.ts
```

これらを並べて結果と速度を比較すると、「**何がどのくらい解けるようになっているか**」の感覚がつかめます。Exercise 5 で詳しく扱います。

## 将来の見通し

`tsgolint` が experimental から stable に到達すれば、oxlint は type-aware を含めて完結したリンターになる見込みです。stable 化のタイミングは公表されていませんが、ロードマップ的には近い将来（数か月〜1年単位）が射程です。

stable に到達した瞬間に、oxlint 単独で「ESLint + `@typescript-eslint`」を完全置換できる可能性があります。それまでは **「ESLint 残置 / tsgolint alpha / Biome v2」のどれかを選ぶ過渡期** と捉えるのが正しい位置付けです。

## まとめ

- type-aware ルールは AST だけでは判定できず、型推論結果が必要
- 2026年5月時点で oxlint は **tsgolint バックエンドで alpha 対応**（59/61 ルール、TS 7.0+ 必須）
- 競合の Biome v2 は **stable で type-aware 対応済み**（独自型推論、TS 互換 75〜85%）
- 選択肢は4つ：A) ESLint残置（保守的）/ B) tsgolint alpha 試す（先進的）/ C) Biome v2 に乗り換え / D) `tsc --noEmit` 補完
- どれを選ぶかは、組織のリスク許容度・速度要件・既存ESLint資産への依存度で決まる
- tsgolint stable 化までの「過渡期の戦略」として捉えるのが正解

## 参考リンク

- [typescript-eslint: Linting with Type Information](https://typescript-eslint.io/getting-started/typed-linting/)
- [oxc Type-Aware Linting Docs](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [oxc Roadmap (GitHub Projects)](https://github.com/orgs/oxc-project/projects)
- [tsgolint (Go バックエンド)](https://github.com/oxc-project/tsgolint)
- [Announcing Oxlint Type-Aware Linting Alpha | VoidZero](https://voidzero.dev/posts/announcing-oxlint-type-aware-linting-alpha)
- [Biome v2: Type-aware lint without TS compiler](https://biomejs.dev/blog/biome-v2/)
