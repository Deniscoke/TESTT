-- Pixel Proofreader: minimal non-modal dialog (P0 prototype).
--
-- Uses only documented Dialog calls: check, label, separator, button,
-- modify, close, show{ wait = false }.

local ui = {}

local LABELS = {
  orphan = "Orphan pixels",
  double = "Doubled corners (warning)",
  partial_alpha = "Partial alpha",
}

function ui.open(env, deps, prefs)
  local app = env.app
  local dlg = env.Dialog { title = "Pixel Proofreader (P0 prototype)" }

  for _, id in ipairs(deps.detectors.ORDER) do
    dlg:check { id = id, text = LABELS[id], selected = prefs[id] ~= false }
    if id == "orphan" then
      dlg:check { id = "skipIsolated", text = "Ignore fully isolated pixels",
        selected = prefs.skipIsolated == true }
    end
    dlg:newrow()
  end
  dlg:separator { text = "Findings" }
  for _, id in ipairs(deps.detectors.ORDER) do
    dlg:label { id = "count_" .. id, label = LABELS[id], text = "-" }
  end
  dlg:label { id = "status", text = "Analyzes the active cel only. Art is never changed." }

  local function set_status(text) dlg:modify { id = "status", text = text } end

  dlg:button { text = "Analyze", focus = true, onclick = function()
    local d = dlg.data
    local enabled = {}
    for _, id in ipairs(deps.detectors.ORDER) do
      enabled[id] = d[id] == true
      prefs[id] = d[id] == true
    end
    prefs.skipIsolated = d.skipIsolated == true
    local opts = { orphan = { neighborhood = 8, skipIsolated = prefs.skipIsolated } }
    local ok, result, err = pcall(deps.analyze.run, env, deps, app.sprite, app.cel, enabled, opts)
    if not ok then
      set_status("Error: " .. tostring(result))
      return
    end
    if not result then
      set_status(err)
      return
    end
    for _, id in ipairs(deps.detectors.ORDER) do
      local text = enabled[id] and tostring(result.counts[id]) or "off"
      dlg:modify { id = "count_" .. id, text = text }
    end
    set_status(string.format("Frame %d: %d marker pixel(s). Clear markers before export.",
      result.frame, result.drawn))
    app.refresh()
  end }

  dlg:button { text = "Clear markers", onclick = function()
    if not app.sprite then
      set_status("Open a sprite first.")
      return
    end
    local ok, removed = pcall(deps.marker_layer.clear, env, app.sprite)
    if not ok then
      set_status("Error: " .. tostring(removed))
      return
    end
    set_status(removed > 0 and "Markers removed." or "No markers to remove.")
    app.refresh()
  end }

  dlg:button { text = "Close", onclick = function() dlg:close() end }
  dlg:show { wait = false }
  return dlg
end

return ui
