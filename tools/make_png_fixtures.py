"""Dev-only: generates PNG decoder fixtures with independent encoders
(Pillow and ImageMagick) and records the expected RGBA (decoded by Pillow).
Run once; outputs are committed. Usage: python3 tools/make_png_fixtures.py"""
import hashlib, json, os, subprocess
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "tests", "web", "png-fixtures")
os.makedirs(OUT, exist_ok=True)
W, H = 13, 9  # odd sizes exercise partial bytes and Adam7 edge passes

def rgba_pixels():
    px = []
    for y in range(H):
        for x in range(W):
            a = 0 if (x + y) % 7 == 0 else (128 if (x * y) % 5 == 0 else 255)
            px.append(((x * 19) % 256, (y * 31) % 256, ((x + y) * 13) % 256, a))
    return px

def base_rgba():
    im = Image.new("RGBA", (W, H)); im.putdata(rgba_pixels()); return im

expected = {}
def record(name):
    im = Image.open(os.path.join(OUT, name)); im.load()
    rgba = im.convert("RGBA").tobytes()
    expected[name] = {"width": im.width, "height": im.height,
                      "sha256": hashlib.sha256(rgba).hexdigest()}

def save(im, name, **kw):
    im.save(os.path.join(OUT, name), **kw); record(name)

save(base_rgba(), "rgba8.png")
save(base_rgba().convert("RGB"), "rgb8.png")
save(base_rgba().convert("LA"), "graya8.png")
save(base_rgba().convert("L"), "gray8.png")
g1 = Image.new("1", (W, H)); g1.putdata([255 if (x + y) % 3 else 0 for y in range(H) for x in range(W)])
save(g1, "gray1.png")
pal = base_rgba().convert("RGB").quantize(colors=16)
save(pal, "indexed4.png", bits=4)
pal2 = base_rgba().convert("RGB").quantize(colors=200)
pal2.info["transparency"] = 3
save(pal2, "indexed8_trns.png", transparency=3)
rgb_t = base_rgba().convert("RGB")
save(rgb_t, "rgb8_trns.png", transparency=(19, 31, 13))
# Interlaced (Adam7) via ImageMagick from the RGBA source.
src = os.path.join(OUT, "rgba8.png")
for name, extra in [("rgba8_adam7.png", ["-define", "png:color-type=6"]),
                    ("indexed_adam7.png", []),
                    ("gray2_adam7.png", ["-colorspace", "Gray", "-alpha", "off", "-depth", "2",
                                          "-define", "png:color-type=0", "-define", "png:bit-depth=2"])]:
    subprocess.run(["convert", src, *extra, "-interlace", "PNG", os.path.join(OUT, name)], check=True)
    record(name)

with open(os.path.join(OUT, "expected.json"), "w") as f:
    json.dump(expected, f, indent=1, sort_keys=True)
print(json.dumps(expected, indent=1, sort_keys=True))
