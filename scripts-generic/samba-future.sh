#!/bin/bash
echo "..... Installing Samba to Serve Files with SMB .........................."
echo ".....                                              ......................"
echo ".....   IMPORTANT                                  ......................"
echo ".....     If you want to consume Samba file,       ......................"
echo ".....     Install cifs-utils instead.              ......................"
echo ".....                                              ......................"
echo "..... Type Y to Continue or anything else to quite ......................"

read -p "" response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Continuing with the script..."
    # Place the code you want to execute if the user confirms here
    echo "This part of the script is executed after confirmation."
else
    echo "..... Exiting the script. ..............................................."
    return # Stop without exiting the shell.
fi

echo "..... Updating apt ......................................................"
sudo apt update
echo "..... Installing Samba .................................................."
sudo apt install samba
echo "..... Current Samba Version ............................................."
samba -V
echo "..... Ping Saturn over Tailscale ........................................"
tailscale ping saturn.pinscher-tuna.ts.net
echo "..... Mount Sync folder from Saturn ....................................."
smb://wesley.m.conner@saturn.pinscher-tuna.ts.net/
