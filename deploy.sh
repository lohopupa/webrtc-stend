#!/bin/sh

set -e

# Function to check if file has changes
# check_file() {
#  file=$1
#  local_file_id=$(git rev-parse HEAD:$file)
#  remote_file_id=$(git rev-parse origin/HEAD:$file)
#  if [ "$local_file_id" != "$remote_file_id" ]; then
#      echo "true"
#  fi
#  echo "false"
# }

# Input parameters
name=$0
commit_msg=$1

# Files to check
# files_to_check=$(git ls-files */Dockerfile)

# docker compose flags
flags="--detach"

# echo "[INFO]: Fetching data"
# git fetch

# echo "[INFO]: Check changes in "$name
# changed=$(check_file $name)
# if [[ $changed == "true" ]]; then
#     echo "[INFO]: Updating $name"
#     git checkout origin/main $name
#     sh $name $commit_msg
#     echo "[INFO]: Running new "$name
#     exit 0
# else
#     echo "[INFO]: $name is up to date"
# fi

echo "[INFO]: Check if rebuild is needed"
if [[ $commit_msg == *"build"* ]]; then
    flags+=" --build"
# else
#     for file in "${files_to_check[@]}"; do
#         changed=$(check_file $file)
#         if [[ $changed == "true" ]]; then
#             flags+=" --build"
#             break
#         fi
    # done
fi

echo "[INFO]: Pull new changes"
git pull

echo "[INFO]: Run docker compose"
docker-compose --env-file ~/conf.env down
docker-compose --env-file ~/conf.env up $flags

echo "[INFO]: disconnect from server"
exit