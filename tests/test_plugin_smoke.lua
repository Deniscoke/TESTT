-- Smoke test: loads src/plugin.lua with fake globals, registers commands,
-- opens the dialog and clicks its buttons. Proves wiring only, not real
-- Aseprite behaviour.
local F = dofile(ROOT .. "/tests/fake_aseprite.lua")
local H = dofile(ROOT .. "/tests/helpers.lua")

local function fake_dialog_ctor(registry)
  return function(opts)
    local dlg = { title = opts.title, widgets = {}, data = {}, shown = false }
    local function add(kind, t)
      t.kind = kind
      dlg.widgets[#dlg.widgets + 1] = t
      if t.id then dlg.data[t.id] = (kind == "check") and (t.selected == true) or t.text end
      return dlg
    end
    function dlg:check(t) return add("check", t) end
    function dlg:label(t) return add("label", t) end
    function dlg:separator(t) return add("separator", t) end
    function dlg:button(t) return add("button", t) end
    function dlg:newrow() return dlg end
    function dlg:modify(t) if t.id then dlg.data[t.id] = t.text end return dlg end
    function dlg:close() dlg.shown = false end
    function dlg:show() dlg.shown = true return dlg end
    function dlg:click(text)
      for _, w in ipairs(dlg.widgets) do
        if w.kind == "button" and w.text == text then return w.onclick() end
      end
      error("no button " .. text)
    end
    registry[#registry + 1] = dlg
    return dlg
  end
end

return {
  { "plugin registers commands and the dialog runs analyze and clear", function()
    local app = F.new_app()
    app.fs = { joinPath = function(...) return table.concat({ ... }, "/") end }
    local s = F.new_sprite(app, { width = 3, height = 3 })
    local layer = s:_addUserLayer("Art", F.rgb_image({ "AAA", "ABA", "AAA" }))
    app.sprite, app.cel = s, layer:cel(1)

    local dialogs, commands = {}, {}
    local saved = { app = _G.app, ColorMode = _G.ColorMode, Image = _G.Image,
      Point = _G.Point, Dialog = _G.Dialog, init = _G.init, exit = _G.exit }
    _G.app, _G.ColorMode, _G.Image, _G.Point = app, F.ColorMode, F.Image, F.Point
    _G.Dialog = fake_dialog_ctor(dialogs)
    local ok, err = pcall(function()
      dofile(ROOT .. "/src/plugin.lua")
      local plugin = { path = ROOT .. "/src", preferences = {} }
      function plugin:newCommand(t) commands[t.id] = t end
      init(plugin)
      H.eq(commands.PixelProofreaderAnalyze.group, "edit_fx")
      assert(commands.PixelProofreaderAnalyze.onenabled())

      commands.PixelProofreaderAnalyze.onclick()
      local dlg = dialogs[1]
      assert(dlg and dlg.shown)
      dlg:click("Analyze")
      H.eq(dlg.data.count_orphan, "1")
      assert(dlg.data.status:match("1 marker pixel"))
      H.eq(#s.layers, 2)
      dlg:click("Clear markers")
      H.eq(#s.layers, 1)
      H.eq(dlg.data.status, "Markers removed.")

      app.sprite = nil
      assert(not commands.PixelProofreaderAnalyze.onenabled())
      dlg:click("Analyze")
      assert(dlg.data.status:match("sprite"), "graceful message without a sprite")
    end)
    for k, v in pairs(saved) do _G[k] = v end
    if not ok then error(err, 0) end
  end },
}
