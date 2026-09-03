// electron-builder afterSign hook.
//
// When no Apple "Developer ID Application" identity is available (our
// case — this is unsigned, personal-use distribution), electron-builder
// skips code signing entirely and leaves the .app carrying whatever
// stale ad-hoc signature the raw `electron` npm binary shipped with.
// That signature seals a resource set that no longer matches once
// electron-builder has injected app.asar / renamed the executable /
// added icons — so macOS Gatekeeper sees a signature that claims
// resources "must be present" but can't validate them, and refuses to
// launch the app with a misleading "is damaged" dialog (not a real
// corruption — `codesign -vvv` shows the exact mismatch).
//
// Fix: re-sign the whole bundle ad-hoc (`-sign -`) ourselves after
// packaging, so the seal matches the actual final contents. This does
// NOT make Gatekeeper trust the app (still "unidentified developer",
// right-click → Open still applies) — it just stops the false
// "damaged" report caused by the inconsistent inherited signature.
const { execFileSync } = require('node:child_process')
const path = require('node:path')

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = path.join(context.appOutDir, appName)

  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
  execFileSync('codesign', ['-vvv', '--deep', appPath], { stdio: 'inherit' })
}
