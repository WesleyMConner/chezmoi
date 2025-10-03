#!/bin/bash

cat << EOF
If the home directory is missing a dot file that is available from Chezmoi,
insert a link to the default dot file in Chezmoi.

Note: This script does not consider OS-specific overrides at this time.
EOF

# For each dotfile in the chezmoi directory:
find ~/chezmoi -type f -iname "dot_*" -maxdepth 1 -print0 | \
  while IFS= read -r -d $'\0' chezmoi_source; do
    # Ignore the dirname and isolate the basename
    chezmoi_basename=$(basename "$chezmoi_source")
    
    # Identify the "dotfile name" - i.e., strip off the leading "dot_".
    if [[ "$chezmoi_basename" =~ ^dot_(.*)$ ]]; then
      dotfile_name="${BASH_REMATCH[1]}"
      linkdest="${HOME}/.${dotfile_name}"

      # Add a soft link to the chezmoi_source if link_dest is missing.
      if [[ -f "${linkdest}" ]]; then
        echo "${linkdest} already exists."
      else
        echo "Populating ${linkdest} ..."
        ln -s "${chezmoi_source}" "${linkdest}"
      fi
    fi
  done
