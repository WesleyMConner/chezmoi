#!/bin/bash
set -e
echo "[*] Bootstrapping developer environment..."

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  sudo apt update
  sudo apt install -y vim git curl direnv docker.io docker-compose jq
  if ! command -v op &> /dev/null; then
    curl -sS https://downloads.1password.com/linux/debian/amd64/stable/op.deb -o /tmp/op.deb
    sudo apt install -y /tmp/op.deb
    rm /tmp/op.deb
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
  brew install vim git curl direnv docker jq 1password-cli
fi

echo "[*] Done. Remember to configure Docker user groups and log into 1Password CLI."
