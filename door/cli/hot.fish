#!/usr/bin/env fish
# Door Hot List fish wrappers (canonical location)
# Thin wrappers only: delegate behavior to doorctl.

function __aos_hot_usage
    printf '%s\n' \
        'Door Hot Fish Wrappers' \
        '' \
        'Functions (when sourced):' \
        '  hot [args...]       -> doorctl hot [args...]' \
        '  hotlist [args...]   -> doorctl hot list [args...]' \
        '  hotopen [args...]   -> doorctl hot open [args...]' \
        '' \
        'Direct execution (this file):' \
        '  fish hot.fish [args...]   -> doorctl hot [args...]'
end

function __aos_hot_cli_dir --description "Directory of this fish file"
    set -l f (status filename)
    if test -n "$f"
        dirname -- "$f"
    else
        pwd
    end
end

function __aos_hot_doorctl --description "Resolve and run doorctl"
    if command -sq doorctl
        command doorctl $argv
        return $status
    end

    set -l cli_dir (__aos_hot_cli_dir)
    set -l local_doorctl "$cli_dir/doorctl"
    if test -x "$local_doorctl"
        "$local_doorctl" $argv
        return $status
    end

    echo "doorctl not found (PATH or $local_doorctl)" >&2
    return 127
end

function hot --description "Door Hot List frontdoor (interactive UI or passthrough)"
    __aos_hot_doorctl hot $argv
end

function hotlist --description "List Hot List entries via doorctl"
    __aos_hot_doorctl hot list $argv
end

function hotopen --description "Open Hot List entry via doorctl"
    __aos_hot_doorctl hot open $argv
end

function hotadd --description "Add Hot List entry via doorctl"
    __aos_hot_doorctl hot add $argv
end

if not status is-interactive
    switch "$argv[1]"
        case help --help -h
            __aos_hot_usage
            exit 0
    end
    __aos_hot_doorctl hot $argv
    exit $status
end
