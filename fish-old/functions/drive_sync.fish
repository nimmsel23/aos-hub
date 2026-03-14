function drive_sync
    set mount_point "/mnt/alpha_drive"
    set device (lsblk -o NAME,LABEL | grep ALPHA_DRIVE | awk '{print "/dev/"$1}')

    if test -z "$device"
        echo "⚠️  Kein Gerät mit Label 'ALPHA_DRIVE' gefunden."
        return 1
    end

    if not test -d $mount_point
        sudo mkdir -p $mount_point
    end

    if not mount | grep -q $mount_point
        echo "🔄  Mounting $device nach $mount_point..."
        sudo mount $device $mount_point
    else
        echo "✅  Bereits gemountet: $mount_point"
    end

    if test -x "$mount_point/alpha_drive_menu.sh"
        echo "🚀 Starte ALPHA_DRIVE Menü..."
        bash "$mount_point/alpha_drive_menu.sh"
    else
        echo "⚠️  Menü nicht gefunden auf dem Stick!"
    end
end
