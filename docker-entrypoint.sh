#!/bin/sh
set -e

dnsmasq --no-resolv --server="1.1.1.1" --server="8.8.8.8"

echo "nameserver 127.0.0.1" > /etc/resolv.conf

exec su-exec node node dist/main.js
