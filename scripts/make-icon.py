#!/usr/bin/env python3
"""Derive Nib platform icon resources from the canonical logo.

The tracked ``apps/desktop/build/icon_1024.png`` file is the brand source of
truth. This script preserves that file and emits:

  apps/desktop/build/icon.iconset/  - all macOS iconset sizes
  apps/desktop/build/icon.icns      - via `iconutil` (macOS only)
  apps/desktop/build/icon.ico       - multi-size Windows application icon
  apps/desktop/build/icon.png       - 512px Windows/Linux package icon
  apps/desktop/build/tray-icon-mac.png - transparent macOS template icon
  apps/desktop/resources/{icon,tray-icon-32,tray-icon-64}.png - runtime copies

Run: python3 scripts/make-icon.py
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "apps" / "desktop" / "build"
SOURCE = BUILD / "icon_1024.png"

BASE = 1024


def main() -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(f"canonical logo is missing: {SOURCE}")

    with Image.open(SOURCE) as source:
        master = source.convert("RGBA")
    if master.size != (BASE, BASE):
        raise ValueError(
            f"canonical logo must be {BASE}x{BASE}, got {master.width}x{master.height}"
        )

    BUILD.mkdir(parents=True, exist_ok=True)
    windows_icon = BUILD / "icon.ico"
    master.save(
        windows_icon,
        format="ICO",
        sizes=[
            (16, 16),
            (32, 32),
            (48, 48),
            (64, 64),
            (128, 128),
            (256, 256),
        ],
    )
    package_icon = BUILD / "icon.png"
    master.resize((512, 512), Image.LANCZOS).save(package_icon)

    # macOS menu bar icons are template images: the opaque pixels are tinted
    # by the system. The application icon has an opaque dark tile, so using it
    # directly would turn that tile into the tray silhouette. Derive the white
    # mark as a transparent, monochrome image instead.
    #
    # The Nib mark is light artwork on a dark tile, so the silhouette is the
    # *light* pixels rather than the dark ones the previous brand used.
    tray_alpha = master.convert("L").point(
        lambda luminance: max(0, min(255, (luminance - 96) * 255 // 80))
    )
    tray_alpha = ImageChops.multiply(tray_alpha, master.getchannel("A"))
    tray_icon_mac = Image.new("RGBA", master.size, (0, 0, 0, 0))
    tray_icon_mac.putalpha(tray_alpha)
    mark_bounds = tray_alpha.getbbox()
    if mark_bounds is None:
        raise ValueError("canonical logo does not contain a light Nib mark")
    mark = tray_icon_mac.crop(mark_bounds).resize((768, 768), Image.LANCZOS)
    tray_icon_mac = Image.new("RGBA", master.size, (0, 0, 0, 0))
    tray_icon_mac.paste(mark, (128, 128), mark)
    tray_icon_mac_path = BUILD / "tray-icon-mac.png"
    tray_icon_mac.save(tray_icon_mac_path)

    # Runtime copies. The packaged app reads tray-icon.png / icon.png from
    # resources/, and dev builds read icon.png, so both must be regenerated
    # from the same master or a stale mark survives a rebrand.
    resources = ROOT / "apps" / "desktop" / "resources"
    resources.mkdir(parents=True, exist_ok=True)
    master.resize((512, 512), Image.LANCZOS).save(resources / "icon.png")
    # Tray icons are template images too: transparent background, dark mark,
    # so the OS supplies the tint for light and dark menu bars.
    tray_small = Image.new("RGBA", master.size, (0, 0, 0, 0))
    inverse_alpha = ImageChops.multiply(
        master.convert("L").point(
            lambda luminance: max(0, min(255, (luminance - 96) * 255 // 80))
        ),
        master.getchannel("A"),
    )
    tray_small.putalpha(inverse_alpha)
    bounds = inverse_alpha.getbbox()
    if bounds is None:
        raise ValueError("canonical logo does not contain a light Nib mark")
    square = max(bounds[2] - bounds[0], bounds[3] - bounds[1])
    tray_canvas = Image.new("L", (square, square), 0)
    cropped = inverse_alpha.crop(bounds)
    tray_canvas.paste(cropped, ((square - cropped.width) // 2, (square - cropped.height) // 2))
    for size in (32, 64):
        glyph = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        glyph.putalpha(tray_canvas.resize((size, size), Image.LANCZOS))
        glyph.save(resources / f"tray-icon-{size}.png")

    iconset = BUILD / "icon.iconset"
    if iconset.exists():
        shutil.rmtree(iconset)
    iconset.mkdir()
    sizes = [16, 32, 128, 256, 512]
    for sz in sizes:
        master.resize((sz, sz), Image.LANCZOS).save(iconset / f"icon_{sz}x{sz}.png")
        master.resize((sz * 2, sz * 2), Image.LANCZOS).save(
            iconset / f"icon_{sz}x{sz}@2x.png"
        )

    iconutil = shutil.which("iconutil")
    if iconutil is None:
        print(f"used {SOURCE}")
        print(f"wrote {windows_icon}")
        print(f"wrote {package_icon}")
        print(f"wrote {tray_icon_mac_path}")
        print("skipped icon.icns (iconutil is unavailable)")
        return

    icns = BUILD / "icon.icns"
    subprocess.run(
        [iconutil, "-c", "icns", str(iconset), "-o", str(icns)], check=True
    )
    print(f"used {SOURCE}")
    print(f"wrote {windows_icon}")
    print(f"wrote {package_icon}")
    print(f"wrote {tray_icon_mac_path}")
    print(f"wrote {icns}")


if __name__ == "__main__":
    main()
