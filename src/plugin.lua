-- Pixel Proofreader (P0 technical prototype) - Aseprite extension entry point.
-- Adds two commands under Edit > FX. It never edits artwork pixels.

local function load_modules(plugin)
  local function load(...)
    return dofile(app.fs.joinPath(plugin.path, ...))
  end
  local deps = {
    grid = load("core", "grid.lua"),
    detectors = load("core", "detectors.lua"),
    markers = load("core", "markers.lua"),
    adapter = load("aseprite", "adapter.lua"),
    marker_layer = load("aseprite", "marker_layer.lua"),
    analyze = load("aseprite", "analyze.lua"),
  }
  return deps, load("aseprite", "ui.lua")
end

function init(plugin)
  local deps, ui = load_modules(plugin)
  local env = {
    app = app, ColorMode = ColorMode, Image = Image, Point = Point, Dialog = Dialog,
  }
  local prefs = plugin.preferences

  plugin:newCommand {
    id = "PixelProofreaderAnalyze",
    title = "Pixel Proofreader: Analyze...",
    group = "edit_fx",
    onclick = function() ui.open(env, deps, prefs) end,
    onenabled = function() return app.sprite ~= nil end,
  }

  plugin:newCommand {
    id = "PixelProofreaderClear",
    title = "Pixel Proofreader: Clear Markers",
    group = "edit_fx",
    onclick = function()
      if app.sprite then
        deps.marker_layer.clear(env, app.sprite)
        app.refresh()
      end
    end,
    onenabled = function() return app.sprite ~= nil end,
  }
end

function exit(plugin)
end
