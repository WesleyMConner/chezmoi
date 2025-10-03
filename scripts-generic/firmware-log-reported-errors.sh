#!/bin/bash
printf "..... SCRAPING LOGS TO PRODUCE issue-list.txt ...........................\n"
if [ -f "firmwide-issue-list.txt" ]; then
  mv firmwide-issue-list.txt firmwide-issue-list.bak
fi
touch firmwide-issue-list.txt
printf "..... Looking for Firmware Errors in dmesg ..............................\n"
printf "\n***** DMESG FIRMWARE ERRORS *****\n" >> firmwide-issue-list.txt
sudo dmesg | grep -i error | grep -i firmware >> firmwide-issue-list.txt
printf "..... Looking for firmware errors in journalctl .........................\n"
printf "\n***** JOURNALCTL ERRORS *****\n" >> firmwide-issue-list.txt
sudo journalctl -b | grep -i firmware | grep -i error >> firmwide-issue-list.txt
printf "..... Review of captured errors .........................................\n"
less firmwide-issue-list.txt
