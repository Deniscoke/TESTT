local D = dofile(ROOT .. "/src/core/detectors.lua")
local grid = dofile(ROOT .. "/src/core/grid.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")

return {
  { "semi-transparent pixels are flagged", function()
    local g = H.grid({ "AaA", ".b." })
    H.expect(D.partial_alpha(g), { ".#.", ".#." })
  end },
  { "alpha boundaries: 0 and 255 are not flagged, 1 and 254 are", function()
    local g = grid.new(4, 1)
    grid.set(g, 0, 0, 0, 1)
    grid.set(g, 1, 0, 1, 1)
    grid.set(g, 2, 0, 254, 1)
    grid.set(g, 3, 0, 255, 1)
    H.expect(D.partial_alpha(g), { ".##." })
  end },
  { "fully transparent and empty images yield nothing", function()
    H.eq(#D.partial_alpha(H.grid({})), 0)
    H.eq(#D.partial_alpha(H.grid({ "..", "00" })), 0)
  end },
  { "detectors never modify the input grid", function()
    local g = H.grid({ "AAB", "aA.", "0BB" })
    local before = H.snapshot(g)
    D.run_all(g)
    D.orphan(g, { neighborhood = 4, skipIsolated = true })
    H.same_grid(g, before)
  end },
  { "run_all respects disabled detectors and is deterministic", function()
    local g = H.grid({ "ABA", "Aa.", "AA." })
    local r1 = D.run_all(g, { orphan = true, double = false, partial_alpha = true })
    H.eq(#r1.double, 0)
    local r2 = D.run_all(g, { orphan = true, double = false, partial_alpha = true })
    for _, id in ipairs(D.ORDER) do
      H.same_list(H.coords(r1[id]), H.coords(r2[id]), id)
    end
  end },
}
