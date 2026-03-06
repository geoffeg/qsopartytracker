#!/bin/bash
sops encrypt --input-type dotenv --output-type dotenv $1
