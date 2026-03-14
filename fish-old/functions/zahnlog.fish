function zahnlog
  set date (date "+%Y-%m-%d_%H-%M")
  set name "$date"_"$argv[1]"
  ffmpeg -t 60 -f v4l2 -i /dev/video0 ~/AlphaOS-Vault/Journal/Video/Schneidezahn/$name.mp4
  echo "📹 $name.mp4 gespeichert."
end
