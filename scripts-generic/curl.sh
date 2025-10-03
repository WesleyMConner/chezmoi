#!/bin/bash
echo "..... Updating apt ......................................................"
sudo apt update
echo "..... Installing curl ..................................................."
sudo apt install curl
echo "..... Current Curl Version .............................................."
curl --version
