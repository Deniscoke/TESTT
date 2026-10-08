"""Dev-only: draws the original sample sprites (CC0, made for this project).
Outputs are committed to web/assets/. Usage: python3 tools/make_samples.py"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "web", "assets")
os.makedirs(OUT, exist_ok=True)

OUTLINE = (43, 29, 58, 255); GLASS = (190, 226, 240, 255); LIQ = (224, 69, 123, 255)
SHADE = (163, 44, 93, 255); HI = (255, 209, 224, 255); CORK = (150, 98, 60, 255); CORK_D = (110, 70, 42, 255)

def potion(with_issues):
    W = H = 24
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); p = im.load()
    cx, cy, r = 11.5, 14.5, 7.6
    inside = lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    for y in range(H):
        for x in range(W):
            if inside(x, y):
                p[x, y] = LIQ if y >= 13 else GLASS
                if y >= 13 and x >= 14: p[x, y] = SHADE
    for x in range(9, 15):  # neck
        for y in range(4, 8): p[x, y] = GLASS
    for y in range(H):  # 1px outline around everything visible
        for x in range(W):
            if p[x, y][3] == 0 and any(0 <= x + dx < W and 0 <= y + dy < H and p[x + dx, y + dy][3] and p[x + dx, y + dy] != OUTLINE
                                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                p[x, y] = OUTLINE
    for x in range(9, 15):  # cork
        p[x, 2] = CORK; p[x, 3] = CORK_D
    p[8, 2] = p[15, 2] = p[8, 3] = p[15, 3] = OUTLINE
    for x in range(8, 16): p[x, 1] = OUTLINE
    for (x, y) in ((7, 11), (6, 12), (6, 13), (8, 10)): p[x, y] = HI if p[x, y] != OUTLINE else p[x, y]
    if with_issues:
        p[10, 17] = (63, 184, 255, 255)          # stray pixel in the liquid -> orphan
        for (x, y) in ((19, 6), (20, 7), (18, 21)):  # soft glow -> partial alpha
            p[x, y] = (255, 230, 120, 110)
        p[2, 10] = OUTLINE                        # thickens an outline corner -> doubled corner
    return im

potion(True).save(os.path.join(OUT, "sample-potion.png"))
print("ok")
