-- Pixel Proofreader: Aseprite cel image -> core grid (read-only).
--
-- env = { app = app, ColorMode = ColorMode }. Only reads pixels and palette
-- entries; never writes to the sprite.

local adapter = {}

-- Returns the first palette as a list of { index, r, g, b, a }.
function adapter.palette_entries(sprite)
  local out = {}
  local pal = sprite.palettes and sprite.palettes[1]
  if not pal then return out end
  for i = 0, #pal - 1 do
    local c = pal:getColor(i)
    out[#out + 1] = { index = i, r = c.red, g = c.green, b = c.blue, a = c.alpha }
  end
  return out
end

local function gray_mode(ColorMode)
  return ColorMode.GRAY or ColorMode.GRAYSCALE
end

-- Builds a grid from the cel image. Returns grid, or nil and a message.
function adapter.grid_from_cel(env, cel, gridmod)
  local layer = cel.layer
  if layer and layer.isTilemap then
    return nil, "Tilemap layers are not supported by this prototype."
  end
  local img = cel.image
  local mode = img.colorMode
  local CM = env.ColorMode
  local pc = env.app.pixelColor
  local g = gridmod.new(img.width, img.height)

  local alphaOf
  if mode == CM.RGB then
    alphaOf = function(v) return pc.rgbaA(v) end
  elseif mode == gray_mode(CM) then
    alphaOf = function(v) return pc.grayaA(v) end
  elseif mode == CM.INDEXED then
    local sprite = cel.sprite
    local byIndex = {}
    for _, e in ipairs(adapter.palette_entries(sprite)) do byIndex[e.index] = e.a end
    local transparentIndex = sprite.transparentColor
    local isBackground = layer and layer.isBackground
    alphaOf = function(v)
      if v == transparentIndex and not isBackground then return 0 end
      return byIndex[v] or 255
    end
  else
    return nil, "Unsupported color mode for this prototype."
  end

  for y = 0, img.height - 1 do
    for x = 0, img.width - 1 do
      local v = img:getPixel(x, y)
      gridmod.set(g, x, y, alphaOf(v), v)
    end
  end
  return g
end

return adapter
