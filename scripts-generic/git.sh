#!/bin/bash
echo "..... Updating apt ......................................................"
sudo apt update
echo "..... Installing git ...................................................."
sudo apt install git
echo "..... Current git Version .............................................."
git --version
