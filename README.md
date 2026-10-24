# Strata Edge 0.2.0

[日本語](README.md) | [English](README.en.md)

Strata Web UIの「Monitor」をXENEON EDGE（2560×720）で表示するiCUEウィジェット。モデルの稼働状態、生成速度、GPU・メモリ使用量、リクエスト履歴を確認できます。

[ダウンロード](https://github.com/rvhfxb/xeneon-edge-strata-widget/releases/tag/v0.2.0)

初回はヘルパー同梱のZIPを使用してください。対応するヘルパーがすでに動いている場合は、`.icuewidget`だけで更新できます。

## スクリーンショット

2560×720のブラウザープレビュー。

**ダーク**

![Strata Edgeのダークテーマ](docs/images/strata-edge-dark-preview.png)

**ライト**

![Strata Edgeのライトテーマ](docs/images/strata-edge-light-preview.png)

## 必要なもの

- Windows 11、XENEON EDGE、iCUE 5.51以降
- Node.js 22以降（PATHに登録）
- 同じPC上で起動しているStrata（v0.2.4系のDeepSeek / Qwenに対応）
- APIキーなしで利用できる`/health`と`/metrics`

## 導入

1. `strata-edge-0.2.0.zip`を、書き込み可能なフォルダーへ展開します。
2. `helper.config.json`の`strataUrl`を、Strataの起動先に合わせます。初期値は`http://127.0.0.1:8086`です。
3. `Install-Helper.cmd`を実行します。ヘルパーが起動し、次回以降はWindowsへのログオン時に自動起動します。
4. ブラウザーで`http://127.0.0.1:5199/`を開き、モデル名と状態が表示されることを確認します。
5. iCUEで同梱の`strata-edge-0.2.0.icuewidget`を取り込み、XENEON EDGEの画面全体に配置します。

接続先の設定例：

```json
{
  "strataUrl": "http://127.0.0.1:8080"
}
```

接続先はローカルのHTTPサーバーに限ります。`/v1`などのAPIパスは付けず、Strataのポートまでを指定してください。

更新時に設定を保ちたい場合は、同じ形式の`helper.local.json`を作成してください。こちらの設定が優先されます。設定変更後はヘルパーを停止し、再起動してください。

インストール後は、展開したフォルダーとNode.jsの場所を変えずに使用してください。

## 起動・停止・更新

| ファイル | 操作 |
| --- | --- |
| `Start-Helper.cmd` | ヘルパーを起動。無効化した自動起動も再有効化します。 |
| `Stop-Helper.cmd` | ヘルパーを停止。自動起動の設定は維持します。 |
| `Uninstall-Helper.cmd` | ヘルパーを停止し、自動起動を解除します。 |

更新するときは、Stop → 新版ファイルを配置 → Install → 新しい`.icuewidget`を取り込み、の順に進めてください。別のフォルダーへ移す場合は、元のフォルダーでUninstallしてから移動先でInstallしてください。ウィジェットの削除はiCUEで行います。

自動起動を一時的に無効にする場合は、次のコマンドを実行してからStopしてください。Startで元に戻せます。

```powershell
Disable-ScheduledTask -TaskName 'Strata Edge Helper'
```

既存のヘルパーが`127.0.0.1:5199/api/snapshot`を提供していれば共用できます。置き換える場合は、先に既存ヘルパーの停止と自動起動の解除を行ってください。

## 表示について

- Strata Web UIに合わせた配色・フォント・カードを使用し、ダーク／ライトを切り替えられます。
- 速度、GPU負荷・VRAM・温度・電力・PCIe、CPU・RAM・ディスク読み取り、コンテキスト、会話キャッシュ、リクエスト履歴を表示します。
- 速度の数値とグラフは公式Monitorと同じ仕様です。処理中は現在値、アイドル時の数値は直近リクエストの平均を表示します。グラフは過去60秒の履歴なので、数値が残っていてもPrefillのグラフは0になることがあります。
- 2秒ごとに更新します。通信に失敗した場合や10秒以上古いデータは未取得表示になります。Strataが提供しない項目も「–」で表示します。
- Context fillは入力＋出力トークンの占有目安です。Disk readの取得にはStrata側のpsutilが必要です。

## 困ったとき

| 表示・症状 | 確認すること |
| --- | --- |
| `Server not reachable` | Strataが起動しているか、接続先のURLとポートが正しいか確認してください。`helper.local.json`があれば、そちらが優先されます。 |
| `API key needed` | 認証付き接続には対応していません。監視APIをAPIキーなしで利用できる構成が必要です。 |
| `Model not loaded` | Strataでモデルをロードしてください。 |
| ヘルパーが起動しない | `node --version`と`helper-error.log`、`helper-output.log`を確認してください。 |
| ポート5199が使用中 | 既存ヘルパーを共用するか、停止してから起動してください。 |

ログは自動でローテーションされません。月1回、または1 MiBを超えたら確認し、不要なログはヘルパーを停止してから退避・削除してください。

v0.2.0はブラウザーでの表示を確認しています。実iCUEへの取り込み・タッチ操作・再ログオン後の自動起動は未確認です。

## 開発

Node.js 22以降とChromeを使用します。

```powershell
npm ci
npm test
node scripts/test-upstream.cjs --upstream
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-helper.ps1
npm run validate
npm run verify
npm run package
```

実行中のヘルパーを使った表示確認：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1 -OutDir C:\temp\strata-edge-check
```

## ライセンス

[MIT](LICENSE)。Strata由来のコード・CSS・アイコンはMIT、OutfitはSIL OFL 1.1です。詳細は[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)を参照してください。
