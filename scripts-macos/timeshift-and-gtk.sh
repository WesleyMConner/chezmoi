#!/bin/bash
echo "..... Updating apt ......................................................"
sudo apt update
echo "..... Installing timeshift .............................................."
sudo apt install timeshift
echo "..... Current Timeshift Version ........................................."
apt-cache policy timeshift
echo "..... Installing timeshift-gtk .........................................."
sudo apt install timeshift-gtk
echo "..... Current Timeshift-gtk Version ....................................."
/usr/bin/timeshift-gtk --version
