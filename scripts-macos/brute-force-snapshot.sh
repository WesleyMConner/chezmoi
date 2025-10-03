#!/bin/bash

#echo "=====> EUID IS: >$(EUID)<"
#if [ "$EUID" -eq 0 ]; then
#    echo "Script is running as root (likely via sudo)."
#else
#    echo "Script is not running as root, exiting."
#    return
#fi

echo "=====> SUDO_USER IS: >$SUDO_USER<"
if [ -n "$SUDO_USER" ]; then
    echo "Script was invoked using sudo by user: $SUDO_USER"
else
    echo "Script was not invoked using sudo, exiting."
    exit
fi

# IMPORTANT
#   This file builds a zip file of /home/wes excluding the large mounted folder
#   /home/wes/Sync. It is VERY (VERY, VERY) important to create the zip file
#   while inside /home/wes. If the zip file is created external to /home/wes,
#   all subordinate files (including everything in /home/wes/Sync) will be
#   expanded BEFORE zip considers files excluded with the -x option.
#
#   The use of 'pushd .' and 'popd' allow the work to occur in /home/wes.
#
# AVOID AT ALL COST
#   Giving zip a path to $HOME, which requires a carve-out for
#   $HOME/SMG-FOLDER. Zip must fully expand the carve out expression before
#   applying it. Expanding an expresion that incudes the SMB-FOLDER results in
#   a VERY, VERY large number of files.

# (1) Push the starting directory onto the stack.
echo "=====> STARTING DIRECTORY IS: >$(pwd)<"
pushd .
cd /home/wes || exit
echo "=====> NOW IN HOME DIRECTORY: >$(pwd)<"

# (2) Build a timestamp for use in the zipped filename.

datetime="$(date +"(%Y-%m-%d_%H:%M:%S)")"
echo "=====> timestamp: >${datetime}<"

# (3) Ensure the folder for zip files exists.

zipfolder="/mnt/T7_DATA/brute-force-backups"
echo "=====> zipfolder: >${zipfolder}<"
mkdir -p "${zipfolder}"

# (4) Construct the name of the new zip file (with its path).

zipfile="/mnt/T7_DATA/brute-force-backups/wes-backup_${datetime}.zip"
echo "=====> zipfile >${zipfile}<"

# (5) Create the zip file. [Creating in T7 vs a /tmp file.]

echo "Starting zip file population."
zip -r "${zipfile}" . \
  -x ".cache/*" \
  -x ".local/share/chezmoi/*" \
  -x ".local/share/my-backend-project4360/*" \
  -x ".local/share/Trash/*" \
  -x "Sync/*"
  -x "snap/*" \

echo "Completed zip file population."

# (6) Directory listing of the created zipfile.

ls -lahF "${zipfile}"

# (6) Restore the starting directory.

popd || exit
echo "Current Directory >$(pwd)<"
