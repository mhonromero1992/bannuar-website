"""Cut the white page out from around Bannuar's logo (the client's own file), keeping every
mark inside the badge as drawn. White areas enclosed by the badge (the name ribbon) stay."""
import sys
from collections import deque
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()
light = lambda p: min(p)  # 255 = white

bg = [[False] * w for _ in range(h)]
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if light(px[x, y]) >= 200:
            bg[y][x] = True; q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if light(px[x, y]) >= 200 and not bg[y][x]:
            bg[y][x] = True; q.append((x, y))
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and light(px[nx, ny]) >= 200:
            bg[ny][nx] = True; q.append((nx, ny))

rgba = Image.new("RGBA", (w, h))
o = rgba.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if bg[y][x]:
            # near-white edge pixels keep a little alpha so the outline stays smooth
            a = max(0, min(255, int((255 - light((r, g, b))) * 255 / 55)))
            if a == 0:
                o[x, y] = (0, 0, 0, 0)
            else:
                # remove the white that was blended into the edge
                f = a / 255
                un = lambda c: max(0, min(255, int((c - 255 * (1 - f)) / f)))
                o[x, y] = (un(r), un(g), un(b), a)
        else:
            o[x, y] = (r, g, b, 255)

bbox = rgba.getbbox()
rgba = rgba.crop(bbox)
side = max(rgba.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(rgba, ((side - rgba.size[0]) // 2, (side - rgba.size[1]) // 2))
square.save(out)
print("logo", square.size, "from", (w, h), "bbox", bbox)
