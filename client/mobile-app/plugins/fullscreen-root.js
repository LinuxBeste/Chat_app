const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withFullScreenRoot(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app/src/main/java/com/facebook/react/runtime"
      );
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, "react-surface-view-patch.kt"),
        path.join(destDir, "ReactSurfaceView.kt")
      );
      return cfg;
    },
  ]);
};
