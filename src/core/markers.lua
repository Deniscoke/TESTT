-- Pixel Proofreader core: marker planning (pure Lua 5.4).
--
-- Turns detector results into one marker per pixel (priority order decides
-- the colour when a pixel is flagged by several detectors) and picks the
-- nearest palette entry for indexed sprites.

local markers = {}

markers.COLORS = {
  orphan = { r = 255, g = 0, b = 255 },
  double = { r = 0, g = 255, b = 255 },
  partial_alpha = { r = 255, g = 128, b = 0 },
}

-- results: as returned by detectors.run_all; order: list of detector ids.
-- Returns a list of { x, y, id } sorted by (y, x), at most one per pixel.
function markers.plan(results, order)
  local taken, list = {}, {}
  for _, id in ipairs(order) do
    for _, f in ipairs(results[id] or {}) do
      local k = f.y .. ":" .. f.x
      if not taken[k] then
        taken[k] = true
        list[#list + 1] = { x = f.x, y = f.y, id = id }
      end
    end
  end
  table.sort(list, function(a, b)
    if a.y ~= b.y then return a.y < b.y end
    return a.x < b.x
  end)
  return list
end

-- Counts per detector (before de-duplication).
function markers.counts(results, order)
  local c = {}
  for _, id in ipairs(order) do c[id] = #(results[id] or {}) end
  return c
end

-- palette: list of { index = int, r, g, b, a }. Returns the index whose
-- opaque colour is nearest (squared RGB distance) to target, skipping
-- excludeIndex and fully transparent entries. Ties go to the lowest index.
-- Returns nil when no usable entry exists.
function markers.nearest_index(palette, target, excludeIndex)
  local best, bestDist
  for _, e in ipairs(palette) do
    if e.index ~= excludeIndex and (e.a == nil or e.a > 0) then
      local dr, dg, db = e.r - target.r, e.g - target.g, e.b - target.b
      local d = dr * dr + dg * dg + db * db
      if bestDist == nil or d < bestDist or (d == bestDist and e.index < best) then
        best, bestDist = e.index, d
      end
    end
  end
  return best
end

-- Gray level (0..255) for a marker colour, used for gray sprites.
function markers.gray_level(target)
  return math.floor(0.299 * target.r + 0.587 * target.g + 0.114 * target.b + 0.5)
end

return markers
