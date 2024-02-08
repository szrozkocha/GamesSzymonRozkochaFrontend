#!/bin/bash

DIRNAME=$(dirname "$0")
HOST="ftp.rozkocha.pl"
USER="games@rozkocha.pl"
PASSWORD=$(cat ./${DIRNAME}/auth.properties)
DIRNAME="./${DIRNAME}/../dist/frontend/browser/"

cd ${DIRNAME}

ftp -inv $HOST <<EOF
user $USER $PASSWORD
cd frontend
mdel .
binary
mput *
bye
EOF
