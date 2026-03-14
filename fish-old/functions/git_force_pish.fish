function git_force_push
  cd ~/dev
  git add .
  git commit -m "force: overwrite remote"
  git push --force origin alpha
end
