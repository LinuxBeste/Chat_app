const { withAndroidManifest, withDangerousMod, AndroidConfig } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const FILE_PATHS_XML = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
  <cache-path name="cache" path="."/>
  <files-path name="files" path="."/>
  <external-path name="external" path="."/>
  <external-files-path name="external_files" path="."/>
</paths>
`;

module.exports = function withEnsureFileProvider(config) {
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.provider = app.provider || [];
      const exists = app.provider.some(
        (p) => p.$ && p.$["android:authorities"] === "${applicationId}.fileprovider",
      );
      if (!exists) {
        app.provider.push({
          $: {
            "android:name": "androidx.core.content.FileProvider",
            "android:authorities": "${applicationId}.fileprovider",
            "android:exported": "false",
            "android:grantUriPermissions": "true",
          },
          "meta-data": [
            {
              $: {
                "android:name": "android.support.FILE_PROVIDER_PATHS",
                "android:resource": "@xml/file_paths",
              },
            },
          ],
        });
      }
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const resDir = path.join(cfg.modRequest.platformProjectRoot, "app/src/main/res/xml");
      fs.mkdirSync(resDir, { recursive: true });
      const target = path.join(resDir, "file_paths.xml");
      if (fs.existsSync(target)) {
        const existing = fs.readFileSync(target, "utf8");
        if (existing.includes("<cache-path")) {
          return cfg;
        }
      }
      fs.writeFileSync(target, FILE_PATHS_XML);
      return cfg;
    },
  ]);

  return config;
};
