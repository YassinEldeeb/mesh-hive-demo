#!/usr/bin/env bash
set -e

docker compose up -d --build --force-recreate --remove-orphans
