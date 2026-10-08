local F = dofile(ROOT .. "/tests/fake_aseprite.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")
local deps = F.deps(ROOT)
local adapter, grid = deps.adapter, deps.grid

local function cel_for(sprite, image, isBackground)
  local layer = sprite:_addUserLayer("Art", image, nil, 1, isBackground)
  return layer:cel(1)
end

return {
  { "RGB: alpha comes from the alpha channel, key is the pixel value", function()
    local app = F.new_app()
    local s = F.new_sprite(app, { width = 3, height = 1 })
    local cel = cel_for(s, F.rgb_image({ "Aa." }))
    local g = assert(adapter.grid_from_cel(F.env(app), cel, grid))
    H.eq(g.alpha[1], 255) ; H.eq(g.alpha[2], 128) ; H.eq(g.alpha[3], 0)
    H.eq(g.key[1], cel.image:getPixel(0, 0))
  end },
  { "Gray: alpha comes from grayaA", function()
    local app = F.new_app()
    local s = F.new_sprite(app, { width = 2, height = 1, colorMode = F.ColorMode.GRAY })
    local img = F.Image(2, 1, F.ColorMode.GRAY)
    img:drawPixel(0, 0, app.pixelColor.graya(40, 255))
    img:drawPixel(1, 0, app.pixelColor.graya(40, 10))
    local g = assert(adapter.grid_from_cel(F.env(app), cel_for(s, img), grid))
    H.eq(g.alpha[1], 255) ; H.eq(g.alpha[2], 10)
  end },
  { "Indexed: transparent index, palette alpha, background layers", function()
    local app = F.new_app()
    local s = F.new_sprite(app, { width = 4, height = 1, colorMode = F.ColorMode.INDEXED,
      transparentColor = 0,
      palette = { { 0, 0, 0, 255 }, { 255, 0, 0, 255 }, { 0, 255, 0, 100 } } })
    local img = F.Image(4, 1, F.ColorMode.INDEXED)
    img.px = { 0, 1, 2, 9 } -- 9 is outside the palette
    local g = assert(adapter.grid_from_cel(F.env(app), cel_for(s, img), grid))
    H.eq(g.alpha[1], 0) ; H.eq(g.alpha[2], 255) ; H.eq(g.alpha[3], 100) ; H.eq(g.alpha[4], 255)
    local bg = assert(adapter.grid_from_cel(F.env(app), cel_for(s, img, true), grid))
    H.eq(bg.alpha[1], 255, "transparent index is opaque on a background layer")
  end },
  { "Tilemap layers and unknown modes are refused", function()
    local app = F.new_app()
    local s = F.new_sprite(app, { width = 1, height = 1 })
    local cel = cel_for(s, F.rgb_image({ "A" }))
    cel.layer.isTilemap = true
    local g, err = adapter.grid_from_cel(F.env(app), cel, grid)
    assert(g == nil and err:match("Tilemap"))
    local cel2 = cel_for(s, F.Image(1, 1, 99))
    local g2, err2 = adapter.grid_from_cel(F.env(app), cel2, grid)
    assert(g2 == nil and err2:match("Unsupported"))
  end },
  { "adapter never writes to the sprite or image", function()
    local app = F.new_app()
    local s = F.new_sprite(app, { width = 2, height = 2 })
    local cel = cel_for(s, F.rgb_image({ "AB", "a." }))
    local before = F.copy_pixels(cel.image)
    adapter.grid_from_cel(F.env(app), cel, grid)
    H.same_list(F.copy_pixels(cel.image), before)
    H.eq(s.writes, 0)
  end },
}
