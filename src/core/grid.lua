-- Pixel Proofreader core: grid model (pure Lua 5.4, no Aseprite API).
--
-- A grid is { w = int, h = int, alpha = {int}, key = {int} } where pixel
-- (x, y) with 0-based coordinates lives at index y * w + x + 1.
-- alpha is 0..255; key identifies the color (equal key + visible = same color).

local grid = {}

function grid.index(g, x, y)
  return y * g.w + x + 1
end

-- Creates a grid of the given size, fully transparent.
function grid.new(w, h)
  assert(type(w) == "number" and w >= 0 and w == math.floor(w), "invalid width")
  assert(type(h) == "number" and h >= 0 and h == math.floor(h), "invalid height")
  local g = { w = w, h = h, alpha = {}, key = {} }
  for i = 1, w * h do
    g.alpha[i] = 0
    g.key[i] = 0
  end
  return g
end

-- Sets one pixel. Used by the adapter and by tests while building a grid.
function grid.set(g, x, y, alpha, key)
  assert(x >= 0 and x < g.w and y >= 0 and y < g.h, "pixel out of bounds")
  assert(alpha >= 0 and alpha <= 255, "alpha out of range")
  local i = y * g.w + x + 1
  g.alpha[i] = alpha
  g.key[i] = key
end

-- Checks the structural invariants; returns true or false, message.
function grid.validate(g)
  if type(g) ~= "table" then return false, "grid is not a table" end
  if type(g.w) ~= "number" or type(g.h) ~= "number" or g.w < 0 or g.h < 0 then
    return false, "invalid grid size"
  end
  local n = g.w * g.h
  if type(g.alpha) ~= "table" or type(g.key) ~= "table" then
    return false, "missing alpha/key arrays"
  end
  if #g.alpha ~= n or #g.key ~= n then
    return false, "alpha/key length does not match size"
  end
  for i = 1, n do
    local a = g.alpha[i]
    if type(a) ~= "number" or a < 0 or a > 255 then
      return false, "alpha out of range at index " .. i
    end
  end
  return true
end

return grid
