-- Pixel Proofreader: one analysis run on a cel (glue between core and API).
--
-- deps = { grid, detectors, markers, adapter, marker_layer }.
-- Returns a result table { counts, drawn, frame } or nil and a message.

local analyze = {}

function analyze.run(env, deps, sprite, cel, enabled, opts)
  if not sprite then return nil, "Open a sprite first." end
  if not cel then return nil, "Select a layer and frame that contain a cel." end
  if cel.layer and deps.marker_layer.is_owned(cel.layer) then
    return nil, "The marker layer is selected. Select an art layer to analyze."
  end

  local g, err = deps.adapter.grid_from_cel(env, cel, deps.grid)
  if not g then return nil, err end

  local results = deps.detectors.run_all(g, enabled, opts)
  local order = deps.detectors.ORDER
  local plan = deps.markers.plan(results, order)
  local pos = cel.position
  for _, m in ipairs(plan) do
    m.x, m.y = m.x + pos.x, m.y + pos.y
  end

  local frameNumber = cel.frameNumber
  local palette = deps.adapter.palette_entries(sprite)
  local drawn = deps.marker_layer.apply(env, sprite, frameNumber, plan, deps.markers, palette)
  return { counts = deps.markers.counts(results, order), drawn = drawn, frame = frameNumber }
end

return analyze
