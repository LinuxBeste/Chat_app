import { execSync } from "child_process"
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { createHash } from "crypto"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const RELEASE = join(ROOT, "release")

const platform = process.argv[2] || process.platform
const version = "1.0.0"

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex")
}

function getLabel(platform) {
  if (platform === "linux") return "Linux"
  if (platform === "darwin") return "macOS"
  if (platform === "win32") return "Windows"
  return platform
}

async function main() {
  if (!existsSync(RELEASE)) {
    console.error("No release directory found. Run 'pnpm package:${platform}' first.")
    process.exit(1)
  }

  const distDir = join(RELEASE, "dist")
  mkdirSync(distDir, { recursive: true })

  const artifacts = readdirSync(RELEASE).filter((f) => {
    if (f === "dist") return false
    if (f.endsWith("-unpacked")) return false
    if (f.startsWith(".")) return false
    if (f.startsWith("builder-debug")) return false
    if (f.startsWith("ChatApp-")) return false
    return statSync(join(RELEASE, f)).isFile()
  })

  const checksums = []
  for (const file of artifacts) {
    const filePath = join(RELEASE, file)
    const hash = sha256(filePath)
    checksums.push(`${hash}  ${file}`)

    const dest = join(distDir, file)
    const destDir = dirname(dest)
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
    writeFileSync(dest, readFileSync(filePath))
  }

  writeFileSync(join(distDir, "SHA256SUMS"), checksums.join("\n") + "\n")
  console.log(`Checksums:\n${checksums.join("\n")}\n`)

  const label = getLabel(platform)
  const archiveName = `ChatApp-${version}-${label}.zip`
  const archivePath = join(RELEASE, archiveName)

  execSync(`cd "${distDir}" && zip -r "${archivePath}" .`, { stdio: "inherit" })
  console.log(`\nCreated: ${archiveName}`)
}

main()
