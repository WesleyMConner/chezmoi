#!/bin/bash

cat << EOF
.............................................................................."
..........
..........            THIS FILE SHOULD ONLY BE RUN ONCE             .........."
..........
..........        IT EXISTS PRIMARILY FOR DOCUMENTATION        ..............."
..........
..........        sleeping for 10s to allow time to ctrl-c          .........."
..........
.............................................................................."
EOF
sleep 10

echo "..... Output of df (disk free) before mounting T7_Data & T7_TIMESHIFT ..."
df

echo "..... Creating mount points for T7_DATA & T7_TIMESHIFT .................."
echo "..... DO NOT DELETE T7_DATA & T7_TIMESHIFT ONCE CREATED ................."
sudo mkdir -p /mnt/T7_DATA
sudo mkdir -p /mnt/T7_TIMESHIFT

echo "..... Append entries for T7_DATA & T7_TIMESHIFT to /etc/fstab ..........."
echo "..... DO NOT RUN THIS TWICE - IT WILL APPEND EXTRA LINES (sleep 5) ......"
# In the /etc/fstab entries:
#   defaults → default mount options (read/write, auto, etc.)
#     nofail → system will boot even if the drive isn’t attached
#        0 2 → fsck order (0=skip, 1=root-filesystem, 2=other-filesystems) 
sleep 5
sudo tee -a /etc/fstab > /dev/null <<  'EOF'
UUID=495fddd7-dcd2-4488-aeb5-da2176f371ad  /mnt/T7_DATA       ext4  defaults,nofail  0  2
UUID=aecd0343-7399-444d-a366-6e969bf985b5  /mnt/T7_TIMESHIFT  ext4  defaults,nofail  0  2
EOF
sleep 1

echo "..... /etc/fstab after edits (sleep 3) ................................."
cat /etc/fstab
sleep 3

echo "..... Reloading /etc/fstab (sleep 3) ..................................."
sudo systemctl daemon-reload
sleep 3

echo "..... Refreshing all mounts (sleep 3) .................................."
sudo mount -a
sleep 3

echo "..... Output of df after mounting T7_Data & T7_TIMESHIFT ..............."
df
