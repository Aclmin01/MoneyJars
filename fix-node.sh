#!/bin/bash
echo "Dang cai dat NVM tu dong..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Dang xoa cac file node loi (Ban se can nhap mat khau may Mac, go roi Enter, khong hien dau *)..."
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm

echo "Dang cai dat Node 18..."
nvm install 18
nvm use 18
nvm alias default 18

echo "Kiem tra phien ban:"
node -v

echo "CAI DAT XONG! Ban hay TAT HANG cua so Terminal nay, mo Terminal MOI roi tiep tuc nhe!"
