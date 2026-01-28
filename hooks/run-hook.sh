#!/bin/bash
# Wrapper script to run hooks with environment variables
# Loads from .env file in plugin root

SCRIPT_DIR="$(dirname "$0")"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Run the hook script
node "$1"
