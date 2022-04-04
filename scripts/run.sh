#!/usr/bin/env bash

docker build -t cr.yandex/crprasudad2h8egspgoc/shingo:local .
docker run --env PORT=5234 -d -p 5234:5234 --name shingo-local cr.yandex/crprasudad2h8egspgoc/shingo:local
