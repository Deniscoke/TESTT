-- Marker-layer safety tests against the fake API (not the real Aseprite).
local F = dofile(ROOT .. "/tests/fake_aseprite.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")
local deps = F.deps(ROOT)
local ML, analyze = deps.marker_layer, deps.analyze

local ART = { "AAA.", "ABA.", "AAA.", "..aa" } -- orphan B, two partial-alpha pixels

local function setup(opts)
  opts = opts or {}
  local app = F.new_app()
  local s = F.new_sprite(app, { width = opts.w or 4, height = opts.h or 4 })
  local layer = s:_addUserLayer("Art", F.rgb_image(opts.art or ART), opts.pos)
  return app, s, layer, layer:cel(1)
end

local function owned(s) return ML.find_owned(s) end
local function marker_pixels(s)
  local layer = owned(s)[1]
  local cel = layer and layer:cel(1)
  local list = {}
  if not cel then return list end
  for y = 0, cel.image.height - 1 do
    for x = 0, cel.image.width - 1 do
      if cel.image:getPixel(x, y) ~= 0 then list[#list + 1] = x .. "," .. y end
    end
  end
  return list
end

return {
  { "analyze creates exactly one owned marker layer with counts", function()
    local app, s, _, cel = setup()
    local r = assert(analyze.run(F.env(app), deps, s, cel))
    H.eq(r.counts.orphan, 1) ; H.eq(r.counts.partial_alpha, 2) ; H.eq(r.counts.double, 0)
    H.eq(#owned(s), 1)
    H.eq(owned(s)[1].name, ML.NAME)
    H.eq(#s.layers, 2)
    H.eq(app.transactions, 1, "one undoable transaction per run")
    assert(r.drawn >= 2)
  end },
  { "marker colours follow detector priority (RGB)", function()
    local app, s, _, cel = setup()
    analyze.run(F.env(app), deps, s, cel)
    local img = owned(s)[1]:cel(1).image
    local pc = app.pixelColor
    H.eq(img:getPixel(1, 1), pc.rgba(255, 0, 255, 255), "orphan = magenta")
    H.eq(img:getPixel(3, 3), pc.rgba(255, 128, 0, 255), "partial alpha = orange")
  end },
  { "original artwork pixels, user layers and names are never changed", function()
    local app, s, layer, cel = setup()
    local before = F.copy_pixels(cel.image)
    analyze.run(F.env(app), deps, s, cel)
    analyze.run(F.env(app), deps, s, cel)
    ML.clear(F.env(app), s)
    H.same_list(F.copy_pixels(cel.image), before)
    H.eq(layer.name, "Art")
    H.eq(s.layers[1], layer)
    H.eq(layer:cel(1), cel)
    H.eq(#s.layers, 1)
  end },
  { "repeated analysis replaces markers instead of stacking layers", function()
    local app, s, _, cel = setup()
    analyze.run(F.env(app), deps, s, cel)
    local first = marker_pixels(s)
    analyze.run(F.env(app), deps, s, cel)
    H.eq(#owned(s), 1)
    H.same_list(marker_pixels(s), first)
    -- after the art changes (via test setup), markers reflect the new state
    cel.image = F.rgb_image({ "AAAA", "AAAA", "AAAA", "AAAA" })
    local r = analyze.run(F.env(app), deps, s, cel)
    H.eq(r.drawn, 0)
    H.eq(#marker_pixels(s), 0, "stale markers removed")
    H.eq(#owned(s), 1)
  end },
  { "a user layer with the marker name is never touched", function()
    local app = F.new_app()
    local s = F.new_sprite(app, { width = 4, height = 4 })
    local impostor = s:_addUserLayer(ML.NAME, F.rgb_image({ "ZZZZ", "....", "....", "...." }))
    local impostorPixels = F.copy_pixels(impostor:cel(1).image)
    local art = s:_addUserLayer("Art", F.rgb_image(ART))
    analyze.run(F.env(app), deps, s, art:cel(1))
    ML.clear(F.env(app), s)
    H.eq(s.layers[1], impostor)
    H.same_list(F.copy_pixels(impostor:cel(1).image), impostorPixels)
    H.eq(#s.layers, 2)
  end },
  { "all writes happen inside a transaction", function()
    local app, s, _, cel = setup()
    analyze.run(F.env(app), deps, s, cel)
    ML.clear(F.env(app), s)
    assert(s.writes > 0)
    -- the fake raises on any write outside app.transaction; reaching here proves none
    local ok = pcall(function() s:newLayer() end)
    assert(not ok, "fake must reject writes outside a transaction")
  end },
  { "clear removes only owned layers; no-op when none", function()
    local app, s, _, cel = setup()
    H.eq(ML.clear(F.env(app), s), 0)
    H.eq(app.transactions, 0, "no transaction when nothing to clear")
    analyze.run(F.env(app), deps, s, cel)
    H.eq(ML.clear(F.env(app), s), 1)
    H.eq(#owned(s), 0)
    H.eq(#s.layers, 1)
  end },
  { "clean art creates no marker layer", function()
    local app, s, _, cel = setup({ art = { "AAAA", "AAAA", "AAAA", "AAAA" } })
    local r = assert(analyze.run(F.env(app), deps, s, cel))
    H.eq(r.drawn, 0)
    H.eq(#owned(s), 0)
    H.eq(#s.layers, 1)
  end },
  { "graceful failures: no sprite, no cel, marker layer selected, tilemap", function()
    local app, s, _, cel = setup()
    local env = F.env(app)
    local r, err = analyze.run(env, deps, nil, cel)
    assert(r == nil and err:match("sprite"))
    r, err = analyze.run(env, deps, s, nil)
    assert(r == nil and err:match("cel"))
    analyze.run(env, deps, s, cel)
    local markerCel = owned(s)[1]:cel(1)
    r, err = analyze.run(env, deps, s, markerCel)
    assert(r == nil and err:match("marker layer"))
    cel.layer.isTilemap = true
    r, err = analyze.run(env, deps, s, cel)
    assert(r == nil and err:match("Tilemap"))
  end },
  { "cel offset is applied and off-canvas markers are skipped", function()
    local app, s, _, cel = setup({ w = 3, h = 3, art = { "B..", "...", "..." },
      pos = F.Point(2, 1) })
    local r = analyze.run(F.env(app), deps, s, cel)
    H.eq(r.counts.orphan, 1)
    H.same_list(marker_pixels(s), { "2,1" })
    cel.position = F.Point(5, 5) -- entirely off canvas
    r = analyze.run(F.env(app), deps, s, cel)
    H.eq(r.counts.orphan, 1) ; H.eq(r.drawn, 0)
  end },
  { "indexed sprite: markers use nearest non-transparent index, palette unchanged", function()
    local app = F.new_app()
    local palette = { { 0, 0, 0, 255 }, { 250, 0, 250, 255 }, { 10, 10, 10, 255 } }
    local s = F.new_sprite(app, { width = 3, height = 3, colorMode = F.ColorMode.INDEXED,
      transparentColor = 0, palette = palette })
    local img = F.Image(3, 3, F.ColorMode.INDEXED)
    img.px = { 2, 2, 2, 2, 1, 2, 2, 2, 2 } -- index 1 is an orphan
    local layer = s:_addUserLayer("Art", img)
    local r = analyze.run(F.env(app), deps, s, layer:cel(1))
    H.eq(r.counts.orphan, 1)
    H.eq(owned(s)[1]:cel(1).image:getPixel(1, 1), 1)
    H.eq(#s.palettes[1], 3)
    H.eq(s.palettes[1]:getColor(1).red, 250)
  end },
  { "disabled detectors produce no markers", function()
    local app, s, _, cel = setup()
    local r = analyze.run(F.env(app), deps, s, cel,
      { orphan = false, double = false, partial_alpha = false })
    H.eq(r.drawn, 0) ; H.eq(r.counts.orphan, 0)
    H.eq(#owned(s), 0)
  end },
}
