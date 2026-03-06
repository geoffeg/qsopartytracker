#!/bin/bash
scriptDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
export SOPS_AGE_KEY_FILE=$scriptDir/../secrets/age-key.txt
sops --decrypt --input-type dotenv --output-type dotenv $1
