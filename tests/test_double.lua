local D = dofile(ROOT .. "/src/core/detectors.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")

return {
  { "stair-step double: both stacked pixels are flagged", function()
    local g = H.grid({ "AA.", ".AA" })
    H.expect(D.double(g), { ".#.", ".#." })
  end },
  { "longer line with a double", function()
    local g = H.grid({ "AAAA...", "...AAAA" })
    H.expect(D.double(g), { "...#...", "...#..." })
  end },
  { "clean stair-step line has no doubles", function()
    local g = H.grid({ "AA..", "..AA" })
    H.expect(D.double(g), { "....", "...." })
  end },
  { "clean diagonal has no doubles", function()
    local g = H.grid({ "A..", ".A.", "..A" })
    H.expect(D.double(g), { "...", "...", "..." })
  end },
  { "vertical-ish line with a double", function()
    local g = H.grid({ "A.", "A.", "AA", ".A", ".A" })
    H.expect(D.double(g), { "..", "..", "##", "..", ".." })
  end },
  { "corner of a 1px outline box is not flagged", function()
    local g = H.grid({ "AAAA", "A..A", "A..A", "AAAA" })
    H.expect(D.double(g), { "....", "....", "....", "...." })
  end },
  { "filled shapes are not flagged", function()
    local g = H.grid({ "AAA", "AAA", "AAA" })
    H.expect(D.double(g), { "...", "...", "..." })
    local t = H.grid({ "AAA", "AA.", "A.." })
    H.expect(D.double(t), { "...", "...", "..." })
  end },
  { "tiny isolated L is flagged at its corner (heuristic warning)", function()
    local g = H.grid({ "A.", "AA" })
    H.expect(D.double(g), { "..", "#." })
  end },
  { "different colours never form a double", function()
    local g = H.grid({ "AB.", ".AA" })
    H.expect(D.double(g), { "...", "..." })
  end },
  { "transparent pixels never form a double", function()
    local g = H.grid({ "00.", ".00" })
    H.expect(D.double(g), { "...", "..." })
  end },
  { "doubles at the image border", function()
    local g = H.grid({ "AA", ".A" })
    H.expect(D.double(g), { ".#", ".." })
  end },
  { "empty images yield nothing", function()
    H.eq(#D.double(H.grid({})), 0)
    H.eq(#D.double(H.grid({ "....", "...." })), 0)
  end },
}
