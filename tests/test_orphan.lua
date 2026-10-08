local D = dofile(ROOT .. "/src/core/detectors.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")

return {
  { "single different-colour pixel inside a fill is an orphan", function()
    local g = H.grid({ "AAA", "ABA", "AAA" })
    H.expect(D.orphan(g), { "...", ".#.", "..." })
  end },
  { "same-colour diagonal neighbour prevents orphan (8-neighbourhood)", function()
    local g = H.grid({ "B..", ".B.", "..A" })
    -- the two B pixels touch diagonally; A touches nothing of its colour
    H.expect(D.orphan(g), { "...", "...", "..#" })
  end },
  { "4-neighbourhood ignores diagonal neighbours", function()
    local g = H.grid({ "B.", ".B" })
    H.expect(D.orphan(g, { neighborhood = 4 }), { "#.", ".#" })
    H.expect(D.orphan(g, { neighborhood = 8 }), { "..", ".." })
  end },
  { "transparent pixels are never orphans", function()
    local g = H.grid({ "AAA", "A.A", "AAA" })
    H.expect(D.orphan(g), { "...", "...", "..." })
  end },
  { "invisible dirty pixels (alpha 0, non-zero key) are ignored", function()
    local g = H.grid({ "AAA", "A0A", "AAA" })
    H.expect(D.orphan(g), { "...", "...", "..." })
  end },
  { "isolated pixel is reported unless skipIsolated", function()
    local g = H.grid({ "...", ".A.", "..." })
    H.expect(D.orphan(g), { "...", ".#.", "..." })
    H.expect(D.orphan(g, { skipIsolated = true }), { "...", "...", "..." })
  end },
  { "skipIsolated still reports pixels touching other colours", function()
    local g = H.grid({ "BBB", "BAB", "BBB" })
    H.expect(D.orphan(g, { skipIsolated = true }), { "...", ".#.", "..." })
  end },
  { "image borders are handled (corners and edges)", function()
    local g = H.grid({ "BAAAB", "AAAAA", "BAAAB" })
    H.expect(D.orphan(g), { "#...#", ".....", "#...#" })
  end },
  { "semi-transparent pixels are compared by colour too", function()
    local g = H.grid({ "AAA", "AaA", "AAA" })
    -- 'a' has the same key as 'A' but different alpha; key decides colour
    H.expect(D.orphan(g), { "...", "...", "..." })
  end },
  { "empty and fully transparent images yield nothing", function()
    H.eq(#D.orphan(H.grid({})), 0)
    H.eq(#D.orphan(H.grid({ "...", "..." })), 0)
  end },
  { "1x1 opaque image is an isolated orphan", function()
    H.expect(D.orphan(H.grid({ "A" })), { "#" })
    H.expect(D.orphan(H.grid({ "A" }), { skipIsolated = true }), { "." })
  end },
  { "invalid neighbourhood is rejected", function()
    assert(not pcall(D.orphan, H.grid({ "A" }), { neighborhood = 6 }))
  end },
}
