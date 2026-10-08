-- Dependency-free test runner. Usage (from repo root): lua5.4 tests/run.lua
-- Each tests/test_*.lua file returns a list of { name, fn } pairs.

ROOT = arg and arg[1] or "."

local files = {
  "tests/test_grid.lua",
  "tests/test_orphan.lua",
  "tests/test_double.lua",
  "tests/test_partial_alpha.lua",
  "tests/test_markers.lua",
  "tests/test_adapter.lua",
  "tests/test_marker_layer.lua",
  "tests/test_plugin_smoke.lua",
}

local passed, failed, failures = 0, 0, {}
for _, file in ipairs(files) do
  local cases = dofile(ROOT .. "/" .. file)
  for _, case in ipairs(cases) do
    local ok, err = pcall(case[2])
    if ok then
      passed = passed + 1
    else
      failed = failed + 1
      failures[#failures + 1] = file .. " :: " .. case[1] .. "\n    " .. tostring(err)
    end
  end
end

for _, f in ipairs(failures) do print("FAIL " .. f) end
print(string.format("%d passed, %d failed, 0 skipped", passed, failed))
os.exit(failed == 0 and 0 or 1)
