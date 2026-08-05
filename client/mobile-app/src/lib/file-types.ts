const TEXT_MIME = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/csv",
  "text/xml",
  "text/html",
  "text/css",
  "text/javascript",
  "text/x-shellscript",
  "text/yaml",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-yaml",
  "application/x-sh",
  "application/x-httpd-php",
]);

const TEXT_EXTS = [
  "txt",
  "md",
  "markdown",
  "json",
  "log",
  "csv",
  "xml",
  "html",
  "htm",
  "js",
  "ts",
  "tsx",
  "css",
  "yaml",
  "yml",
  "sh",
  "py",
  "sql",
  "ini",
  "conf",
  "env",
  "gitignore",
  "dockerfile",
];

export function isTextFile(type: string | undefined | null, name: string | undefined | null): boolean {
  if (type && TEXT_MIME.has(type)) return true;
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  return TEXT_EXTS.includes(ext);
}
