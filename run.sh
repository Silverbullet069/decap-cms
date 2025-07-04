#!/usr/bin/env bash

# ============================================================================ #

## FILE         : dev.sh
## VERSION      : 1.0.0
## DESCRIPTION  : A sandbox for NodeJS dev server
## AUTHOR       : silverbullet069
## REPOSITORY   : https://github.com/Silverbullet069
## LICENSE      : MIT License

## TEMREPO      : https://github.com/Silverbullet069/bash-script-template
## TEMMODE      : lite
## TEMUPDATED   : 2025-06-23 17:35:11.284575680 +0700
## TEMLIC       : MIT License

# ============================================================================ #

# DESC: Acquire script lock, extracted from script.sh
# ARGS: $1 (optional): Scope of script execution lock (system or user)
# OUTS: None
# RETS: None
# NOTE: This lock implementation is extremely simple yet reliable
#       across all platforms. It does *not* support locking a script with
#       symlinks or multiple hardlinks as there's no portable way of doing so.
#       If the lock was acquired it's automatically released on script exit.
function lock_init() {
  local lock_dir
  if [[ "${1}" = "system" ]]; then
    lock_dir="/tmp/$(basename "${BASH_SOURCE[0]}").lock"
  elif [[ "${1}" = "user" ]]; then
    lock_dir="/tmp/$(basename "${BASH_SOURCE[0]}").${UID}.lock"
  else
    echo "Missing or invalid argument to ${FUNCNAME[0]}()!" >&2
    exit 1
  fi

  if mkdir "${lock_dir}" 2>/dev/null; then
    readonly script_lock="${lock_dir}"
    echo "Acquired script lock: ${script_lock}"
  else
    echo "Unable to acquire script lock: ${lock_dir}" >&2
    exit 2
  fi
}

# DESC: Handler for exiting the script
# ARGS: None
# OUTS: None
# RETS: None
function script_trap_exit() {
  # Remove script execution lock
  if [[ -d "${script_lock-}" ]]; then
    rmdir "${script_lock}"
    echo "Clean up script lock: ${script_lock}" >&2
  fi
}

# ============================================================================ #

# Enable xtrace if the DEBUG environment variable is set
if [[ ${DEBUG-} =~ ^1|yes|true$ ]]; then
  set -o xtrace # Trace the execution of the script (debug)
fi

# Only enable these shell behaviours if we're not being sourced
# Approach via: https://stackoverflow.com/a/28776166/8787985
if ! (return 0 2>/dev/null); then
  # A better class of script...
  set -o errexit  # Exit on most errors (see the manual)
  set -o nounset  # Disallow expansion of unset variables
  set -o pipefail # Use last non-zero exit code in a pipeline
fi

# Enable errtrace or the error trap handler will not work as expected
set -o errtrace # Ensure the error trap handler is inherited

# Make `for f in *.txt` work when `*.txt` matches zero files
shopt -s nullglob globstar

# Set IFS to preferred implementation
#IFS=$' '

function main() {
  trap script_trap_exit EXIT
  #lock_init "user"

  if docker ps -a --format '{{.Names}}' | grep -q '^decap-cms-dev$'; then
    docker exec -it decap-cms-dev /bin/bash
    return 0
  fi

  # Mount CWD inside Docker container to avoid deleting `cd` command from Agent mode's commands prompting
  # hit Ctrl+Z to stop the process inside container
  # DO NOT HIT CTRL+C 3 times!
  # NOTE: 4GB is the just-right amount
  docker run \
    --name="decap-cms-dev" \
    --rm \
    -it \
    --init \
    --security-opt=no-new-privileges:true \
    --dns="127.0.0.1" \
    -p="8080:8080" \
    -v="${PWD}:${PWD}" \
    -w="${PWD}" \
    --cpus=3 \
    -m="4096m" \
    -e NODE_OPTIONS="--max-old-space-size=4096" \
    node:lts-bookworm /bin/bash
}

# Invoke main with args if not sourced
if ! (return 0 2>/dev/null); then
  main "$@"
fi
