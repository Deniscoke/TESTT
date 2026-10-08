-- Pixel Proofreader: management of the tool-owned marker layer.
--
-- The tool identifies its layer ONLY by an extension-defined property
-- (Aseprite 1.3-rc1+), never by name, so a user layer that happens to share
-- the name is never touched. All writes happen inside app.transaction so a
-- single Undo reverts them. User layers, cels, frames and palettes are never
-- modified.
--
-- env = { app, ColorMode, Image, Point }.

local ML = {}

ML.KEY = "deniscoke/pixel-proofreader"
ML.NAME = "Pixel Proofreader Markers"

function ML.is_owned(layer)
  local ok, owner = pcall(function() return layer.properties(ML.KEY).owner end)
  return ok and owner == true
end

-- All owned layers anywhere in the layer tree, in stack order.
function ML.find_owned(sprite)
  local found = {}
  local function walk(layers)
    for _, layer in ipairs(layers) do
      if ML.is_owned(layer) then found[#found + 1] = layer end
      if layer.isGroup then walk(layer.layers) end
    end
  end
  walk(sprite.layers)
  return found
end

-- Integer pixel value for a marker colour in the sprite's colour mode.
local function marker_value(env, sprite, rgb, markers, palette)
  local CM, pc = env.ColorMode, env.app.pixelColor
  if sprite.colorMode == CM.RGB then
    return pc.rgba(rgb.r, rgb.g, rgb.b, 255)
  elseif sprite.colorMode == (CM.GRAY or CM.GRAYSCALE) then
    return pc.graya(markers.gray_level(rgb), 255)
  else
    return markers.nearest_index(palette, rgb, sprite.transparentColor)
  end
end

-- Replaces this tool's markers on frameNumber with the given plan.
-- plan: list of { x, y, id } in sprite (canvas) coordinates.
-- Returns the number of marker pixels drawn.
function ML.apply(env, sprite, frameNumber, plan, markers, palette)
  local drawn = 0
  env.app.transaction("Pixel Proofreader: Analyze", function()
    local owned = ML.find_owned(sprite)
    local layer = owned[1]
    for i = 2, #owned do sprite:deleteLayer(owned[i]) end

    if layer then
      local old = layer:cel(frameNumber)
      if old then sprite:deleteCel(old) end
    end
    if #plan == 0 then return end

    if not layer then
      layer = sprite:newLayer()
      layer.name = ML.NAME
      layer.properties(ML.KEY).owner = true
    end

    local img = env.Image(sprite.spec)
    img:clear()
    local values = {}
    for _, m in ipairs(plan) do
      if m.x >= 0 and m.y >= 0 and m.x < sprite.width and m.y < sprite.height then
        local v = values[m.id]
        if v == nil then
          v = marker_value(env, sprite, markers.COLORS[m.id], markers, palette) or false
          values[m.id] = v
        end
        if v then
          img:drawPixel(m.x, m.y, v)
          drawn = drawn + 1
        end
      end
    end
    sprite:newCel(layer, frameNumber, img, env.Point(0, 0))
  end)
  return drawn
end

-- Deletes every tool-owned layer. Returns how many were removed.
function ML.clear(env, sprite)
  local owned = ML.find_owned(sprite)
  if #owned == 0 then return 0 end
  env.app.transaction("Pixel Proofreader: Clear markers", function()
    for _, layer in ipairs(owned) do sprite:deleteLayer(layer) end
  end)
  return #owned
end

return ML
