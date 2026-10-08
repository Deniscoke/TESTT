-- In-memory fake of the small, documented Aseprite API subset used by the
-- extension. It is NOT Aseprite: it only lets the glue code's own contract be
-- tested (ownership, transactions, never writing to user data). Every sprite
-- mutation outside app.transaction raises an error so tests catch it.

local F = {}

F.ColorMode = { RGB = 0, GRAY = 1, INDEXED = 2, TILEMAP = 4 }

local pixelColor = {
  rgba = function(r, g, b, a) return r | (g << 8) | (b << 16) | (a << 24) end,
  rgbaR = function(v) return v & 0xff end,
  rgbaA = function(v) return (v >> 24) & 0xff end,
  graya = function(v, a) return v | (a << 8) end,
  grayaV = function(v) return v & 0xff end,
  grayaA = function(v) return (v >> 8) & 0xff end,
}

function F.Point(x, y) return { x = x, y = y } end

-- Image(width, height, colorMode) or Image(spec)
function F.Image(a, b, c)
  local w, h, mode, transparent
  if type(a) == "table" then
    w, h, mode, transparent = a.width, a.height, a.colorMode, a.transparentColor or 0
  else
    w, h, mode, transparent = a, b, c or F.ColorMode.RGB, 0
  end
  local img = { width = w, height = h, colorMode = mode, px = {},
    spec = { width = w, height = h, colorMode = mode, transparentColor = transparent } }
  for i = 1, w * h do img.px[i] = transparent end
  function img:getPixel(x, y) return self.px[y * self.width + x + 1] end
  function img:drawPixel(x, y, v) self.px[y * self.width + x + 1] = v end
  function img:clear()
    for i = 1, self.width * self.height do self.px[i] = self.spec.transparentColor end
  end
  return img
end

local function new_properties()
  local store = {}
  return setmetatable({}, { __call = function(_, key)
    store[key] = store[key] or {}
    return store[key]
  end })
end

local function new_layer(sprite, name)
  local layer = { sprite = sprite, name = name or "Layer", isGroup = false,
    isTilemap = false, isBackground = false, layers = {}, cels = {},
    properties = new_properties() }
  function layer:cel(frameNumber) return self.cels[frameNumber] end
  return layer
end

function F.new_app()
  local app = { pixelColor = pixelColor, transactions = 0, depth = 0, alerts = {} }
  function app.transaction(label, fn)
    if fn == nil then fn = label end
    app.transactions = app.transactions + 1
    app.depth = app.depth + 1
    local ok, err = pcall(fn)
    app.depth = app.depth - 1
    if not ok then error(err, 0) end
  end
  function app.alert(msg) app.alerts[#app.alerts + 1] = msg end
  function app.refresh() end
  return app
end

-- opts: { width, height, colorMode, transparentColor, palette = {{r,g,b,a},...} }
function F.new_sprite(app, opts)
  local s = { width = opts.width, height = opts.height,
    colorMode = opts.colorMode or F.ColorMode.RGB,
    transparentColor = opts.transparentColor or 0, layers = {}, writes = 0 }
  s.spec = { width = s.width, height = s.height, colorMode = s.colorMode,
    transparentColor = s.transparentColor }
  local entries = opts.palette or {}
  local pal = setmetatable({}, { __len = function() return #entries end })
  function pal:getColor(i)
    local e = entries[i + 1]
    return { red = e[1], green = e[2], blue = e[3], alpha = e[4] or 255 }
  end
  s.palettes = { pal }

  local function guard()
    if app.depth == 0 then error("sprite modified outside app.transaction", 2) end
    s.writes = s.writes + 1
  end

  -- Test setup helper (not part of the Aseprite API): adds a user layer.
  function s:_addUserLayer(name, image, position, frameNumber, isBackground)
    local layer = new_layer(self, name)
    layer.isBackground = isBackground or false
    self.layers[#self.layers + 1] = layer
    if image then
      local cel = { sprite = self, layer = layer, image = image,
        position = position or F.Point(0, 0), frameNumber = frameNumber or 1 }
      layer.cels[cel.frameNumber] = cel
    end
    return layer
  end

  function s:newLayer()
    guard()
    local layer = new_layer(self, "Layer " .. (#self.layers + 1))
    self.layers[#self.layers + 1] = layer
    return layer
  end

  function s:deleteLayer(layer)
    guard()
    for i, l in ipairs(self.layers) do
      if l == layer then table.remove(self.layers, i) return end
    end
    error("layer not found")
  end

  function s:newCel(layer, frameNumber, image, position)
    guard()
    local cel = { sprite = self, layer = layer, image = image,
      position = position, frameNumber = frameNumber }
    layer.cels[frameNumber] = cel
    return cel
  end

  function s:deleteCel(cel)
    guard()
    cel.layer.cels[cel.frameNumber] = nil
  end

  return s
end

function F.env(app)
  return { app = app, ColorMode = F.ColorMode, Image = F.Image, Point = F.Point }
end

function F.deps(ROOT)
  return {
    grid = dofile(ROOT .. "/src/core/grid.lua"),
    detectors = dofile(ROOT .. "/src/core/detectors.lua"),
    markers = dofile(ROOT .. "/src/core/markers.lua"),
    adapter = dofile(ROOT .. "/src/aseprite/adapter.lua"),
    marker_layer = dofile(ROOT .. "/src/aseprite/marker_layer.lua"),
    analyze = dofile(ROOT .. "/src/aseprite/analyze.lua"),
  }
end

-- Builds an RGB image from ASCII rows: '.' transparent, uppercase opaque,
-- lowercase alpha 128; colour channels derived from the letter.
function F.rgb_image(rows)
  local h = #rows
  local w = h > 0 and #rows[1] or 0
  local img = F.Image(w, h, F.ColorMode.RGB)
  for y = 1, h do
    for x = 1, w do
      local ch = rows[y]:sub(x, x)
      if ch ~= "." then
        local a = ch:match("%u") and 255 or 128
        local b = ch:upper():byte()
        img:drawPixel(x - 1, y - 1, pixelColor.rgba(b, b, b, a))
      end
    end
  end
  return img
end

function F.copy_pixels(img)
  local t = {}
  for i = 1, #img.px do t[i] = img.px[i] end
  return t
end

return F
