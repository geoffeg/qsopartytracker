#!/bin/bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <dotenv-file>" >&2
  exit 1
fi
sops encrypt --input-type dotenv --output-type dotenv "$1"
