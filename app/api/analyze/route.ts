import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import puppeteer from "puppeteer";

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

    // Puppeteerでスクリーンショットを撮る
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // スクリーンショットをBase64で取得
    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    // Claude Vision APIでスクリーンショットを分析してHTML/CSSを生成
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: screenshot,
              },
            },
            {
              type: "text",
              text: `このWebページのスクリーンショットを見て、**完全に忠実に再現した**学習用のHTML/CSSコードを作成してください。

【最重要ルール】
- スクリーンショットの見た目を**ピクセル単位で正確に**再現する
- レイアウト、配色、タイポグラフィ、余白をすべて同じにする
- 存在しない要素を追加しない
- テキストはスクリーンショットから読み取って正確に記述する

【絶対守るべき要件】
1. 完全なHTML5構造を記述:
   <!DOCTYPE html>
   <html lang="ja">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>ページタイトル</title>
     <style>...</style>
   </head>
   <body>...</body>
   </html>

2. CSSは<style>タグ内に**すべて**記述（外部CSSは使用しない）

3. 画像は <img src="https://via.placeholder.com/幅x高さ" alt="説明"> で代替

4. スクリーンショットと同じ配色・レイアウトを再現

5. HTMLとCSSのコードのみを返す（説明文は不要、マークダウン記号も不要）`,
            },
          ],
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

    // スクリーンショットベースなので画像はプレースホルダーを使用
    // 画像ダウンロードは不要
    console.log(`Generated HTML from screenshot`);

    return NextResponse.json({
      html: generatedCode,
      success: true,
      imagesDownloaded: 0,
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
