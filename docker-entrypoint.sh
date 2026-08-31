#!/bin/sh
set -e

UPSTREAM=$(grep "^nameserver" /etc/resolv.conf | awk '{print $2}' | head -1)
UPSTREAM=${UPSTREAM:-8.8.8.8}

dnsmasq --no-resolv --server="${UPSTREAM}"

echo "nameserver 127.0.0.1" > /etc/resolv.conf

exec su-exec node node dist/main.js
