#!/bin/bash

# Design Notes
#   - source ~/Sync/bin/common.zshrc
#     Allows this file to set defaults for Jupiter (iMac) and Saturn (M1 Mini)

printf "Applying content from ~/Sync/bin/common.zshrc ...\n"

# Source global definitions
if [[ -f /etc/zshrc ]]; then
  source /etc/zshrc
fi

arch_name="$(uname -m)"
 
if [ "${arch_name}" = 'x86_64' ]; then
  alias brew_dir='/usr/local/bin/'
elif [ "${arch_name}" = 'arm64' ]; then
  alias brew_dir='/opt/homebrew/bin'
else
  printf "* * *   U N K N O W N   A R C H I T E C T U R E   * * *\n"
fi

alias nano="${brew_dir}/nano"

setopt HIST_EXPIRE_DUPS_FIRST
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_IGNORE_SPACE
setopt HIST_FIND_NO_DUPS
setopt HIST_SAVE_NO_DUPS
