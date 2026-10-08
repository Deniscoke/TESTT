-- Shared test helpers: fixture parsing and assertions (no dependencies).

local ROOT = ROOT or "."
local grid = dofile(ROOT .. "/src/core/grid.lua")

local H = {}

-- Builds a grid from ASCII rows.
--   '.'        transparent (alpha 0)
--   'A'..'Z'   opaque colour (alpha 255, key = byte)
--   'a'..'z'   semi-transparent (alpha 128) version of the uppercase colour
--   '0'        alpha 0 but non-zero key (invisible "dirty" transparent pixel)
function H.grid(rows)
  local h = #rows
  local w = h > 0 and #rows[1] or 0
  local g = grid.new(w, h)
  for y = 1, h do
    assert(#rows[y] == w, "ragged fixture row " .. y)
    for x = 1, w do
      local ch = rows[y]:sub(x, x)
      if ch == "." then
        -- stays transparent
      elseif ch == "0" then
        grid.set(g, x - 1, y - 1, 0, 99)
      elseif ch:match("%u") then
        grid.set(g, x - 1, y - 1, 255, ch:byte())
      elseif ch:match("%l") then
        grid.set(g, x - 1, y - 1, 128, ch:upper():byte())
      else
        error("unknown fixture char '" .. ch .. "'")
      end
    end
  end
  return g
end

-- Converts an expected mask ('#' = finding) into a sorted "x,y" list.
function H.mask(rows)
  local out = {}
  for y = 1, #rows do
    for x = 1, #rows[y] do
      if rows[y]:sub(x, x) == "#" then out[#out + 1] = (x - 1) .. "," .. (y - 1) end
    end
  end
  return out
end

function H.coords(findings)
  local out = {}
  for _, f in ipairs(findings) do out[#out + 1] = f.x .. "," .. f.y end
  return out
end

local function show(list) return "{" .. table.concat(list, " ") .. "}" end

function H.eq(actual, expected, msg)
  if actual ~= expected then
    error((msg or "values differ") .. ": expected " .. tostring(expected)
      .. ", got " .. tostring(actual), 2)
  end
end

function H.same_list(actual, expected, msg)
  local ok = #actual == #expected
  if ok then
    for i = 1, #actual do
      if actual[i] ~= expected[i] then ok = false break end
    end
  end
  if not ok then
    error((msg or "lists differ") .. ": expected " .. show(expected)
      .. ", got " .. show(actual), 2)
  end
end

-- Asserts that detector findings match an expected mask.
function H.expect(findings, maskRows, msg)
  H.same_list(H.coords(findings), H.mask(maskRows), msg)
end

function H.snapshot(g)
  local s = { w = g.w, h = g.h, alpha = {}, key = {} }
  for i = 1, g.w * g.h do
    s.alpha[i] = g.alpha[i]
    s.key[i] = g.key[i]
  end
  return s
end

function H.same_grid(a, b, msg)
  H.eq(a.w, b.w, msg) ; H.eq(a.h, b.h, msg)
  for i = 1, a.w * a.h do
    if a.alpha[i] ~= b.alpha[i] or a.key[i] ~= b.key[i] then
      error((msg or "grid changed") .. " at index " .. i, 2)
    end
  end
end

return H
