import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, sessionId } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "画像URLが指定されていません" },
        { status: 400 }
      );
    }

    // 画像をダウンロード
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイル名を生成（URLのハッシュ値を使用）
    const hash = crypto.createHash("md5").update(imageUrl).digest("hex");
    const ext = imageUrl.split(".").pop()?.split("?")[0] || "jpg";
    const filename = `${sessionId}_${hash}.${ext}`;

    // public/analyzed-imagesに保存
    const filepath = join(process.cwd(), "public", "analyzed-images", filename);
    await writeFile(filepath, buffer);

    // 公開URLを返す
    const publicUrl = `/analyzed-images/${filename}`;

    return NextResponse.json({
      success: true,
      originalUrl: imageUrl,
      localUrl: publicUrl,
    });
  } catch (error) {
    console.error("Error downloading image:", error);
    return NextResponse.json(
      {
        error: "画像のダウンロードに失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
