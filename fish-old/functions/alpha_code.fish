#!/usr/bin/env fish
# -----------------------------------------------------------
#  ALPHA_OS CLI · Pillar 1: THE ALPHA CODE
#  FRAME: Real · Raw · Relevant · Results
# -----------------------------------------------------------
set -l BP "$HOME/AlphaOS/blueprints"
set -l LOGDIR "$HOME/AlphaOS/journal/code"
set -l DATE   (date +"%F")
set -l LOG    "$LOGDIR/$DATE-alpha_code.md"
mkdir -p $LOGDIR

# --- helper ------------------------------------------------
function view_file --argument f
  bat --plain --paging=always --style=plain --line-range : $f
end

function ask_one --argument prompt
  echo (gum input --prompt "» $prompt : ")
end

function headline --argument txt
  echo -e "\n## $txt ($DATE)\n" >> $LOG
end

# --- 1· THEORIE (Kapitel 1-7) ------------------------------
set -l theory  1 2 3 4 5 6 7
for n in $theory
  set fp (ls $BP/$n'*'.md 2>/dev/null)[1]
  test -f $fp; and begin
    view_file $fp
    gum confirm "Weiter?" || exit 0
  end
end

# --- 2· PRAKTISCH (Real → Results) -------------------------
# ----- REAL -----------------------------------------------
set fp (ls $BP/8*Real*.md 2>/dev/null)[1]
test -f $fp; and view_file $fp
gum confirm "Starte REAL-Abfrage?" || exit 0

headline "REAL – Facts"
for d in Body Being Balance Business
  set a (ask_one "Wo stehst du REAL im Bereich $d")
  echo "- **$d:** $a" >> $LOG
end

# ----- RAW -----------------------------------------------
set fp (ls $BP/9*Raw*.md 2>/dev/null)[1]
test -f $fp; and view_file $fp
gum confirm "Starte RAW-Abfrage?" || exit 0

headline "RAW – Feelings"
for d in Body Being Balance Business
  set a (ask_one "Was fühlst du RAW im Bereich $d")
  echo "- **$d:** $a" >> $LOG
end

# ----- RELEVANT -------------------------------------------
set fp (ls $BP/10*Relevant*.md 2>/dev/null)[1]
test -f $fp; and view_file $fp
gum confirm "Starte RELEVANT-Abfrage?" || exit 0

headline "RELEVANT – Warum ist das wichtig?"
set rel (ask_one "Warum wird Veränderung JETZT relevant?")
echo "$rel" >> $LOG

# ----- RESULTS --------------------------------------------
set fp (ls $BP/11*Results*.md 2>/dev/null)[1]
test -f $fp; and view_file $fp
gum confirm "Starte RESULTS-Abfrage?" || exit 0

headline "RESULTS – Konkrete Ergebnisse"
for d in Body Being Balance Business
  set a (ask_one "Welches messbare RESULT im Bereich $d bis nächsten Review?")
  echo "- **$d:** $a" >> $LOG
end

# --- 3· TASKWARRIOR-Hook ----------------------------------
task add project:AlphaOS pillar:Code wait:tomorrow              \
     "Review REAL/RAW/RELEVANT/RESULTS – $DATE"

echo -e "\n✅  Antworten gespeichert: $LOG\n"
