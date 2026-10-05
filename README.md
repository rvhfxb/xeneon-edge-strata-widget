# Strata Edge 0.1.5

Strata v0.1.39 の公式 Web UI「Monitor」を XENEON EDGE（2560×720）に合わせたコミュニティ製 iCUE ウィジェット。作者: rvhfxb。Strata / CORSAIR の公式製品ではありません。

[配布ファイルをダウンロード](https://github.com/rvhfxb/xeneon-edge-strata-widget/releases/tag/v0.1.5)。初回はヘルパー同梱 ZIP、既存ヘルパーがある場合は `.icuewidget` を使用してください。GitHub の「Source code」ZIP は開発用ソースです。

## 必要なもの

- Windows 11、XENEON EDGE、iCUE 5.51 以降。
- Node.js 22 以降が PATH に登録されていること。Node.js は ZIP に含まれません。
- 同じ PC 上で起動した Strata。確認対象は v0.1.39、監視 API は `/health` と `/metrics`、初期接続先は `http://127.0.0.1:8086`。
- 監視 API が API キーを要求しない構成。本版は認証付き接続に対応していません。

## 初めて導入する

1. `strata-edge-0.1.5.zip` を任意の**書き込み可能な固定フォルダー**へ展開。ZIP 内から直接起動しないでください。
2. Strata のポートが 8086 以外なら `helper.config.json` の `strataUrl` を変更。例: `http://127.0.0.1:8080`。単一の接続先を指定します。
3. `Install-Helper.cmd` を実行。現在ユーザーのログオン時に非表示で起動するタスク `Strata Edge Helper` を登録し、今すぐ起動します。
4. `http://127.0.0.1:5199/` をブラウザーで開き、モデル名・状態が表示されることを確認。
5. iCUE の XENEON EDGE ウィジェット追加から同梱の `strata-edge-0.1.5.icuewidget` を取り込み、画面全体へ配置。

CMD は PowerShell の実行ポリシーをそのプロセスだけ Bypass にして起動します。PC 全体のポリシーは変更しません。組織のポリシーで実行が禁止されている場合は、その管理方針に従ってください。

ウィジェットだけを取り込んでも監視にはヘルパーが必要です。初回の配布には ZIP を使ってください。インストール後は本フォルダーと Node.js の場所を変えないでください。

## 既存の Strata ヘルパーがある場合

旧 Strata Monitor の `XENEON EDGE Strata Helper` が `127.0.0.1:5199/api/snapshot` を提供していれば共用できます。**ヘルパーを追加登録せず、icuewidget だけ取り込めます。** 共用時、5199 のブラウザープレビューは既存ヘルパー側の画面です。

新版ヘルパーへ移行する場合は、既存のインストールフォルダーで `Stop-Widget.ps1` を実行し、`Disable-ScheduledTask -TaskName 'XENEON EDGE Strata Helper'` で旧タスクを無効にしてから新版を導入します。旧ファイルは保管します。両方を同時起動すると5199が競合します。新インストーラーは既存タスクや別ヘルパーを自動停止しません。

## 表示仕様

- 公式の Outfit・色・カード・アイコン・ラベル・計算式を使用。CSSはStrata v0.1.39の固定commitとハッシュで照合し、tokens.cssのフォントURL2箇所のみ同梱先へ変更しています。2048×576 CSS px を全画面時に1.25倍し、小さい領域では等比縮小。
- 左に Model state と均等幅4列×2行のメトリック、右に Context fill と Recent requests（領域に収まる直近5件、最大12件）。
- Decode / Prefill、GPU load / VRAM / temp / power / PCIe、CPU / Disk read、System RAM / Experts、コンテキスト・リクエスト・累計を表示。サーバー切り替えはありません。
- **速度の数値とグラフは公式 v0.1.39 と同じ仕様。** 処理中は現在値、アイドル時の数値は最後のリクエストの平均。グラフは過去60秒のサンプルで、Prefill を処理していない時間は0です。数値が残っていてもグラフは0になる場合があります。欠損サンプルを0として描く処理も公式に準拠。
- 初期ダーク。ヘッダーボタンの変更を保存。iCUE 設定の Theme を変更すると反映し、設定が変わらない更新通知ではヘッダーの選択を戻しません。
- 表示は2秒ごとに取得。ヘルパーは `/health` と `/metrics` への GET のみを使い、ロード・アンロード・推論要求は送りません。通信失敗・10秒以上古い値では速度などを未取得表示にします。
- Context fill は入力＋出力の占有目安で、KV 実使用量ではありません。メモリは公式同様の1024基準。Disk read は Strata 側に psutil がないと未取得になります。

## 起動・停止・更新・削除

- `Start-Helper.cmd`: 手動起動。本タスクが無効なら再有効化。Runningでも応答がなくポートが空いていれば再起動します。別のプロセスがポートを使用中なら停止しません。
- `Stop-Helper.cmd`: 今回の実行を停止。停止済み・Disabledでも繰り返し実行できます。次回ログオンでは、タスクが有効なら起動。
- `Uninstall-Helper.cmd`: 本フォルダーに対応するタスクを停止・解除。ウィジェットは iCUE 側で削除。
- 自動起動を一時無効化: `Disable-ScheduledTask -TaskName 'Strata Edge Helper'` の後に Stop。復帰は Start。
- 接続先変更後: Stop → Start。設定はヘルパー起動時に読み直します。
- 同じ場所への更新: Stop → 新版ファイルを配置 → Install → 新しい icuewidget を取り込み。別フォルダーへ移す場合は旧フォルダーで Uninstall 後、新フォルダーで Install。
- 復旧: 新版を停止・解除して保管した旧版を元の場所から起動。旧共用ヘルパーへ戻すなら `Enable-ScheduledTask -TaskName 'XENEON EDGE Strata Helper'` と旧 `Start-Widget.ps1`。

ログの自動ローテーションはありません。起動・エラーのみを記録し、リクエストごとの計測ログは追記しません。月1回、または `helper-output.log` / `helper-error.log` が1 MiBを超えたら確認し、Stopで停止してからログを退避・削除し、Startで再開してください。

Strata 自体は上記操作では停止しません。タスクは現在ユーザー / Interactive / Limited、ログオン時起動、異常終了時は1分間隔3回再試行です。

## 困ったとき

- `Server not reachable`: Strata の起動状態、`helper.config.json`、`http://127.0.0.1:5199/api/snapshot` を確認。
- `API key needed`: 監視 API が認証を要求しています。本版の対象外。
- 5199 競合: 既存ヘルパーを共用するか、提供元の停止手順を使用。
- 起動失敗: `helper-error.log` / `helper-output.log` と `node --version`（22以上）を確認。
- `Model not loaded`: ヘルパーとの通信は成立していますが、Strata 側にモデルがありません。

接続先の `strataUrl` が欠落・nullなら初期値8086を使用します。`localhost` は127.0.0.1へ正規化します。IPv6の接続先は `http://[::1]:ポート` を指定してください。

ヘルパーは 127.0.0.1:5199 のみで待ち受けます。接続先設定も localhost / 127.0.0.1 / ::1 の HTTP origin に限定。URL に API パスや認証情報を含めず、設定ファイルに API キーや秘密値を書かないでください。

## ライセンス

本プロジェクト: MIT（`LICENSE`）。Strata 由来コード・CSS・アイコン: MIT（`widget/resources/STRATA-LICENSE.txt`）。Outfit: SIL OFL 1.1（`widget/resources/fonts/OFL.txt`）。詳細は `THIRD-PARTY-NOTICES.md`。

ZIP 内の `SHA256SUMS.txt` は同梱ファイルのハッシュ一覧。ZIP と icuewidget 自体は別添 `strata-edge-0.1.5-SHA256SUMS.txt` で確認できます。

## 検証と制限 — 2026-10-05

Node ヘルパー HTTP テスト、PowerShell 構文・タスク操作の模擬検証、Chrome file:// の状態・テーマ回帰テスト、2560×720 / 1280×360 / 736×207 の表示、公式 CLI 0.4.47 の validate / package、ZIP 内容・ハッシュ一致を検証。

**0.1.5 の実 iCUE 取り込み、実機タッチ、Windows 再ログオンでの自動起動は未検証。** 既存 helper / Strata は配布ファイルの作成だけでは更新されません。

通常はResizeObserverとresizeイベントで画面に合わせます。ResizeObserver非対応の埋め込みブラウザーのみ、以前iCUEで有効だった1秒間隔の再計算を残しています。

## 開発（ソースフォルダー）

```powershell
npm ci
npm test
node scripts/test-upstream.cjs --upstream
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-helper.ps1
npm run validate
npm run verify
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1 -OutDir C:\temp\strata-edge-check
npm run package
```

`verify-browser.cjs` は Chrome と Node.js 22 以上を使い模擬データで検証。レイアウト診断はDevTools経由で開発スクリプトを注入し、出荷版のapp.jsには含めません。`check.ps1` は起動済みヘルパーの実データを使用。開発スクリプトと npm 依存は配布 ZIP に含めません。

