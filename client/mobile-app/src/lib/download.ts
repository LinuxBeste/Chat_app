import { File, Paths } from "expo-file-system"
import { Share } from "react-native"

export async function downloadAndShare(url: string, filename: string): Promise<void> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-") || "file"
  const target = new File(Paths.cache, `${Date.now()}-${safeName}`)
  const downloaded = await File.downloadFileAsync(url, target)
  await Share.share({ url: downloaded.uri })
}
