#!/usr/bin/env bash

docker build -t cr.yandex/crprasudad2h8egspgoc/shingo:latest --platform linux/amd64 .
docker push cr.yandex/crprasudad2h8egspgoc/shingo:latest
