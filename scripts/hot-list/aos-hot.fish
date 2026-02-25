#!/usr/bin/env fish
# Deprecated compatibility shim.
# Canonical fish wrapper path: aos-hub/door/cli/hot.fish

set -l _shim_dir (dirname (status current-filename))
set -l _canonical "$_shim_dir/../../door/cli/hot.fish"

if test -f "$_canonical"
    source "$_canonical"
else
    echo "❌ Missing canonical hot fish wrapper: $_canonical" >&2
    return 1
end
