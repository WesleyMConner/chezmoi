#!/bin/bash
echo "..... Updating apt ....................................................."
sudo apt update
echo "..... Installing cifs-utils (to mount CIFS/SMB files) .................."
sudo apt install cifs-utils
echo "..... Current CIFS Version ............................................."
apt-cache policy cifs-utils

## Mounting is achieved by:
##   - Populating /etc/smbcredentials with:
##       username=...
##       password=...
##  - sudo chmod 600 /etc/smbcredentials
##  - adding a line to /etc/fstab
##      //<mac_address>/<shared_folder> /mnt/macos_share cifs credentials=/etc/smbcredentials,uid=$(id -u <ubuntu_username>),gid=$(id -g <ubuntu_username>) 0 0
##  - sudo mount -a
