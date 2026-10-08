-- Pixel Proofreader core: the three P0 detectors (pure Lua 5.4).
--
-- Rules are specified in docs/DETECTORS.md. Every detector only reads the
-- grid and returns a list of findings { x = int, y = int } in row-major
-- order (y, then x), so results are deterministic.

local detectors = {}

local N8 = {
  { -1, -1 }, { 0, -1 }, { 1, -1 },
  { -1, 0 }, { 1, 0 },
  { -1, 1 }, { 0, 1 }, { 1, 1 },
}
local N4 = { { 0, -1 }, { -1, 0 }, { 1, 0 }, { 0, 1 } }
local QUADRANTS = { { -1, -1 }, { 1, -1 }, { -1, 1 }, { 1, 1 } }

-- Visible pixel at (x, y) with the given key; out of bounds counts as no.
local function same(g, x, y, key)
  if x < 0 or y < 0 or x >= g.w or y >= g.h then return false end
  local i = y * g.w + x + 1
  return g.alpha[i] > 0 and g.key[i] == key
end

local function visible(g, x, y)
  if x < 0 or y < 0 or x >= g.w or y >= g.h then return false end
  return g.alpha[y * g.w + x + 1] > 0
end

-- A. Orphan pixels.
-- opts.neighborhood: 8 (default) or 4.
-- opts.skipIsolated: when true, a pixel with no visible neighbour at all is
-- not reported (e.g. a deliberate single-pixel star).
function detectors.orphan(g, opts)
  opts = opts or {}
  local hood = opts.neighborhood or 8
  assert(hood == 8 or hood == 4, "neighborhood must be 4 or 8")
  local offsets = (hood == 8) and N8 or N4
  local out = {}
  for y = 0, g.h - 1 do
    for x = 0, g.w - 1 do
      local i = y * g.w + x + 1
      if g.alpha[i] > 0 then
        local key = g.key[i]
        local hasSame, hasVisible = false, false
        for _, o in ipairs(offsets) do
          local nx, ny = x + o[1], y + o[2]
          if same(g, nx, ny, key) then
            hasSame = true
            break
          end
          if visible(g, nx, ny) then hasVisible = true end
        end
        if not hasSame and not (opts.skipIsolated and not hasVisible) then
          out[#out + 1] = { x = x, y = y }
        end
      end
    end
  end
  return out
end

-- B. Doubled corners (warning-level heuristic, see docs/DETECTORS.md).
function detectors.double(g)
  local out = {}
  for y = 0, g.h - 1 do
    for x = 0, g.w - 1 do
      local i = y * g.w + x + 1
      if g.alpha[i] > 0 then
        local c = g.key[i]
        local n4 = 0
        for _, o in ipairs(N4) do
          if same(g, x + o[1], y + o[2], c) then n4 = n4 + 1 end
        end
        if n4 == 2 then
          for _, q in ipairs(QUADRANTS) do
            local dx, dy = q[1], q[2]
            if same(g, x + dx, y, c)
                and same(g, x, y + dy, c)
                and not same(g, x + dx, y + dy, c)
                and not (same(g, x + 2 * dx, y, c) and same(g, x, y + 2 * dy, c)) then
              out[#out + 1] = { x = x, y = y }
              break
            end
          end
        end
      end
    end
  end
  return out
end

-- C. Partial alpha: 0 < alpha < 255.
function detectors.partial_alpha(g)
  local out = {}
  for y = 0, g.h - 1 do
    for x = 0, g.w - 1 do
      local a = g.alpha[y * g.w + x + 1]
      if a > 0 and a < 255 then
        out[#out + 1] = { x = x, y = y }
      end
    end
  end
  return out
end

-- Detector ids in marker-priority order.
detectors.ORDER = { "orphan", "double", "partial_alpha" }

-- Runs the enabled detectors. enabled: table id -> bool (nil = all on).
-- Returns { orphan = {...}, double = {...}, partial_alpha = {...} }; a
-- disabled detector yields an empty list.
function detectors.run_all(g, enabled, opts)
  local results = {}
  for _, id in ipairs(detectors.ORDER) do
    if enabled == nil or enabled[id] then
      results[id] = detectors[id](g, opts and opts[id])
    else
      results[id] = {}
    end
  end
  return results
end

return detectors
