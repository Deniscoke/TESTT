-- Prints the Lua reference detector results for a fixture file, one line per
-- (case, detector variant): "<case#> <variant> x,y x,y ...".
-- Usage: lua5.4 tools/lua_reference.lua <fixtures.txt> [repo-root]
-- Used by tests/js/run.js to check the JavaScript port for parity.

local path = assert(arg[1], "fixture file required")
ROOT = arg[2] or "."
local D = dofile(ROOT .. "/src/core/detectors.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")

local cases, cur = {}, nil
for line in io.lines(path) do
  if line:match("^#") then
    -- comment or case name; a case starts at its first grid row
  elseif line == "" then
    if cur then cases[#cases + 1] = cur; cur = nil end
  else
    cur = cur or {}
    cur[#cur + 1] = line
  end
end
if cur then cases[#cases + 1] = cur end

local VARIANTS = {
  { "orphan8", function(g) return D.orphan(g, { neighborhood = 8 }) end },
  { "orphan8skip", function(g) return D.orphan(g, { neighborhood = 8, skipIsolated = true }) end },
  { "orphan4", function(g) return D.orphan(g, { neighborhood = 4 }) end },
  { "orphan4skip", function(g) return D.orphan(g, { neighborhood = 4, skipIsolated = true }) end },
  { "double", D.double },
  { "partial_alpha", D.partial_alpha },
}

for i, rows in ipairs(cases) do
  local g = H.grid(rows)
  for _, v in ipairs(VARIANTS) do
    io.write(i, " ", v[1])
    for _, f in ipairs(v[2](g)) do io.write(" ", f.x, ",", f.y) end
    io.write("\n")
  end
end
