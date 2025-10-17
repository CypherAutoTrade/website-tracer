import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 画像URLを抽出する関数
function extractImageUrls(html: string, baseUrl: string): string[] {
  const imageUrls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const cssBackgroundRegex = /url\(['"]?([^'")\s]+)['"]?\)/gi;

  let match;

  // img タグから抽出
  while ((match = imgRegex.exec(html)) !== null) {
    imageUrls.push(match[1]);
  }

  // CSS background-image から抽出
  while ((match = cssBackgroundRegex.exec(html)) !== null) {
    imageUrls.push(match[1]);
  }

  // 相対URLを絶対URLに変換
  return imageUrls
    .map(url => {
      try {
        if (url.startsWith('http')) return url;
        if (url.startsWith('//')) return 'https:' + url;
        if (url.startsWith('/')) return new URL(url, baseUrl).href;
        return new URL(url, baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter((url): url is string => url !== null && !url.startsWith('data:'));
}

// 画像をダウンロードして保存する関数
async function downloadAndSaveImage(imageUrl: string, sessionId: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイル名を生成
    const hash = crypto.createHash("md5").update(imageUrl).digest("hex").substring(0, 12);
    const ext = imageUrl.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const validExt = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext) ? ext : "jpg";
    const filename = `${sessionId}_${hash}.${validExt}`;

    // public/analyzed-imagesに保存
    const filepath = join(process.cwd(), "public", "analyzed-images", filename);
    await writeFile(filepath, buffer);

    return `/analyzed-images/${filename}`;
  } catch (error) {
    console.error(`Failed to download image: ${imageUrl}`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URLが指定されていません" },
        { status: 400 }
      );
    }

    // セッションIDを生成
    const sessionId = Date.now().toString();

    // URLからHTMLを取得
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await response.text();

    // Claude APIでHTMLを分析して詳細なHTML/CSSを生成
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `あなたはプロフェッショナルなフロントエンドエンジニアです。以下のWebページのHTMLを分析して、**元のページを視覚的に忠実に再現した**学習用のHTML/CSSコードを作成してください。

【最重要ルール】
- 元のページの構造・レイアウト・デザインを**そのまま再現**する
- 存在しないセクションやコンテンツを勝手に追加しない
- シンプルなページはシンプルに、複雑なページは複雑に再現する
- 元のページの見た目と雰囲気を完全にコピーする

【絶対守るべき要件】
1. 完全なHTML5構造を記述:
   <!DOCTYPE html>
   <html lang="ja">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>元のタイトル</title>
     <style>...</style>
   </head>
   <body>元のコンテンツをそのまま再現</body>
   </html>

2. CSSは<style>タグ内に**すべて**記述（外部CSSは使用しない）

3. 元のページにある要素だけを含める:
   - 元のHTMLを解析して、実際に存在する要素だけを再現
   - ヘッダー、ナビ、フッターなどは元のページにあれば含める
   - なければ含めない

4. スタイリングを元のページから忠実に再現:
   - レイアウト（元のページと同じ配置）
   - 配色（背景、テキスト、ボーダーなど元と同じ色）
   - タイポグラフィ（font-family、サイズ、太さ、行間）
   - 余白（margin、padding）
   - 装飾（border-radius、box-shadow、border）

5. 画像は<img>タグで元のURLをsrc属性に設定:
   例: <img src="https://..." alt="...">

6. 元のページのテキストコンテンツをそのまま使用

7. 日本語でコメントを追加（簡潔に）

8. HTMLとCSSのコードのみを返す（説明文は不要、マークダウン記号も不要）

9. 元のページがシンプルなら、シンプルなコードを生成する

分析対象のHTML:
${html.substring(0, 20000)}`,
        },
      ],
    });

    let generatedCode =
      message.content[0].type === "text" ? message.content[0].text : "";

    // マークダウンのコードブロック記号を削除
    generatedCode = generatedCode
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim();

    // 生成されたコードから画像URLを抽出
    const imageUrls = extractImageUrls(generatedCode, url);
    console.log(`Found ${imageUrls.length} images to download`);

    // 画像をダウンロードしてURLマッピングを作成
    const imageMapping: { [key: string]: string } = {};

    // 最大10枚の画像をダウンロード（多すぎる場合は制限）
    const imagesToDownload = imageUrls.slice(0, 10);

    await Promise.all(
      imagesToDownload.map(async (imageUrl) => {
        const localUrl = await downloadAndSaveImage(imageUrl, sessionId);
        if (localUrl) {
          imageMapping[imageUrl] = localUrl;
          console.log(`Downloaded: ${imageUrl} -> ${localUrl}`);
        }
      })
    );

    // HTMLコード内の画像URLをローカルURLに置き換え
    Object.entries(imageMapping).forEach(([originalUrl, localUrl]) => {
      generatedCode = generatedCode.replace(new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), localUrl);
    });

    console.log(`Successfully downloaded and replaced ${Object.keys(imageMapping).length} images`);

    return NextResponse.json({
      html: generatedCode,
      success: true,
      imagesDownloaded: Object.keys(imageMapping).length,
    });
  } catch (error) {
    console.error("Error analyzing URL:", error);
    return NextResponse.json(
      {
        error: "URLの分析に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
