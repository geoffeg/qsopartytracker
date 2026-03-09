#!/bin/bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <dotenv-file>" >&2
  exit 1
fi

scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
export SOPS_AGE_KEY_FILE="${scriptDir}/../secrets/age-key.txt"
if [ ! -r "$SOPS_AGE_KEY_FILE" ]; then
  echo "Error: SOPS key file '$SOPS_AGE_KEY_FILE' not found or not readable." >&2
  exit 1
fi

sops --decrypt --input-type dotenv --output-type dotenv "$1"
