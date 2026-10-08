local grid = dofile(ROOT .. "/src/core/grid.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")

return {
  { "new grid is fully transparent", function()
    local g = grid.new(3, 2)
    H.eq(#g.alpha, 6)
    for i = 1, 6 do H.eq(g.alpha[i], 0) end
    assert(grid.validate(g))
  end },
  { "zero-size grids are valid", function()
    assert(grid.validate(grid.new(0, 0)))
    assert(grid.validate(grid.new(5, 0)))
  end },
  { "rejects invalid sizes and pixels", function()
    assert(not pcall(grid.new, -1, 2))
    assert(not pcall(grid.new, 1.5, 2))
    local g = grid.new(2, 2)
    assert(not pcall(grid.set, g, 2, 0, 255, 1))
    assert(not pcall(grid.set, g, 0, 0, 256, 1))
  end },
  { "validate catches malformed grids", function()
    assert(not grid.validate(nil))
    assert(not grid.validate({ w = 2, h = 2, alpha = { 0 }, key = { 0 } }))
    assert(not grid.validate({ w = 1, h = 1, alpha = { 300 }, key = { 0 } }))
  end },
  { "row-major indexing", function()
    local g = grid.new(4, 3)
    H.eq(grid.index(g, 0, 0), 1)
    H.eq(grid.index(g, 3, 0), 4)
    H.eq(grid.index(g, 0, 1), 5)
    H.eq(grid.index(g, 3, 2), 12)
  end },
}
