local M = dofile(ROOT .. "/src/core/markers.lua")
local D = dofile(ROOT .. "/src/core/detectors.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")

return {
  { "plan keeps one marker per pixel with priority order", function()
    local results = {
      orphan = { { x = 1, y = 0 } },
      double = { { x = 1, y = 0 }, { x = 0, y = 0 } },
      partial_alpha = { { x = 1, y = 0 }, { x = 0, y = 1 } },
    }
    local plan = M.plan(results, D.ORDER)
    H.eq(#plan, 3)
    H.eq(plan[1].x .. plan[1].y .. plan[1].id, "00double")
    H.eq(plan[2].x .. plan[2].y .. plan[2].id, "10orphan")
    H.eq(plan[3].x .. plan[3].y .. plan[3].id, "01partial_alpha")
    local c = M.counts(results, D.ORDER)
    H.eq(c.orphan, 1) ; H.eq(c.double, 2) ; H.eq(c.partial_alpha, 2)
  end },
  { "nearest_index skips the transparent index and transparent entries", function()
    local pal = {
      { index = 0, r = 255, g = 0, b = 255, a = 255 }, -- exact match but excluded
      { index = 1, r = 0, g = 0, b = 0, a = 255 },
      { index = 2, r = 250, g = 0, b = 250, a = 0 },   -- transparent entry
      { index = 3, r = 200, g = 0, b = 200, a = 255 },
    }
    H.eq(M.nearest_index(pal, M.COLORS.orphan, 0), 3)
    H.eq(M.nearest_index(pal, M.COLORS.orphan, nil), 0)
  end },
  { "nearest_index ties go to the lowest index; empty palette gives nil", function()
    local pal = {
      { index = 5, r = 10, g = 0, b = 0, a = 255 },
      { index = 2, r = 10, g = 0, b = 0, a = 255 },
    }
    H.eq(M.nearest_index(pal, { r = 0, g = 0, b = 0 }, nil), 2)
    H.eq(M.nearest_index({}, { r = 0, g = 0, b = 0 }, nil), nil)
    H.eq(M.nearest_index({ { index = 0, r = 0, g = 0, b = 0, a = 255 } },
      { r = 0, g = 0, b = 0 }, 0), nil)
  end },
  { "gray levels are within range", function()
    for _, c in pairs(M.COLORS) do
      local v = M.gray_level(c)
      assert(v >= 0 and v <= 255)
    end
  end },
}
