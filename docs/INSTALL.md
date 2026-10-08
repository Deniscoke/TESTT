# Pixel Proofreader P0: install (private testing only)

This is a **technical prototype**. It has not been verified in a real Aseprite installation and is not for distribution.

## Get the file
1. Open the latest successful **Verify repository** run on branch `claude/digital-product-research-khriom` in GitHub Actions.
2. Download the artifact `pixel-proofreader-p0`. It is temporary and is not a release.
3. Unzip the artifact download. Inside are `pixel-proofreader-0.0.1-p0.aseprite-extension` and its `.sha256` file. Check the hash with `sha256sum -c *.sha256`.

You can also build it locally with `tools/package.sh`, which needs `zip` and `sha256sum`.

## Install in Aseprite (expected 1.3 or newer)
1. Save your work and **use a copy of a sprite** for testing.
2. *Edit > Preferences > Extensions > Add Extension*, then choose the `.aseprite-extension` file.
3. Restart Aseprite if the commands do not appear.

## Use
- *Edit > FX > Pixel Proofreader: Analyze...* opens the dialog. Choose the checks, then click **Analyze**. Only the **active cel** (current layer and frame) is analyzed.
- Findings appear on a new top layer named **Pixel Proofreader Markers**: magenta for orphans, cyan for doubled corners, orange for partial alpha.
- **Clear markers** (in the dialog or *Edit > FX > Pixel Proofreader: Clear Markers*) removes only the tool's own layer.
- Each Analyze or Clear is one undo step (*Edit > Undo*).
- **Clear the markers before saving or exporting.** The marker layer is a normal layer and would otherwise be saved or exported with the art.

## Uninstall
*Edit > Preferences > Extensions*, select *Pixel Proofreader*, then *Uninstall*.
