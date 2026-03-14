# ~/.config/fish/config.fish - foot specific optimizations
set fish_greeting  # Leeres greeting = schneller start

# Essential Wayland variables for Fish
set -gx XDG_RUNTIME_DIR "/run/user/"(id -u)
set -gx XDG_CURRENT_DESKTOP sway
set -gx XDG_SESSION_TYPE wayland
set -gx FONTCONFIG_PATH /etc/fonts

# Update systemd environment when in Sway
if test -n "$SWAYSOCK"
    systemctl --user import-environment \
        WAYLAND_DISPLAY DISPLAY XDG_CURRENT_DESKTOP \
        SWAYSOCK I3SOCK XCURSOR_SIZE XCURSOR_THEME
end

if test "$TERM" = "foot"
    # Enable 24-bit color
    set -gx COLORTERM truecolor
    
    # Better less/man pages
    set -gx LESS_TERMCAP_mb (printf "\e[1;32m")
    set -gx LESS_TERMCAP_md (printf "\e[1;32m")
    set -gx LESS_TERMCAP_me (printf "\e[0m")
    set -gx LESS_TERMCAP_se (printf "\e[0m")
    set -gx LESS_TERMCAP_so (printf "\e[01;33m")
    set -gx LESS_TERMCAP_ue (printf "\e[0m")
    set -gx LESS_TERMCAP_us (printf "\e[1;4;31m")
end

starship init fish | source

#set -gx XDG_CURRENT_DESKTOP sway
set -gx GTK_THEME Matcha-dark-sea
set -gx QT_QPA_PLATFORM wayland
set -gx QT_QPA_PLATFORMTHEME qt5ct
set -gx QT_WAYLAND_DISABLE_WINDOWDECORATION 1
set -gx MOZ_ENABLE_WAYLAND 1

source ~/.config/fish/conf.d/*.fish
source ~/.config/fish/completions/*.fish
source ~/.config/fish/functions/*.fish

# --- Pfad ---
set -gx PATH $HOME/bin $PATH
set -gx PATH $HOME/dev $PATH
set -Ux PYTHONPATH ~/dev/alpha-os

# --- Prompt ---
function fish_prompt
    set_color green
    echo -n "[αOS] "
    set_color green
    echo -n "$USER@$hostname:"
  set_color blue
  echo -n "["(task _get rc.context)"] "
  set_color normal
  echo -n (prompt_pwd) ' > '
end

if test -f ~/.ticktick.env
    source ~/.ticktick.env
end

if status is-interactive
    # Commands to run in interactive sessions can go here
    echo "🔥 AlphaOS & Taskwarrior Fish integration loaded!"
    echo "💡 Commands: BODY, BEING, BALANCE, BUSINESS, CORE4, FIRE, Voice, core4, alpha, "
end

abbr tt "tickadd"
