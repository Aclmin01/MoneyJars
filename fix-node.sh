#!/bin/bash
echo "Dang don dep cac file bi loi..."
sudo rm -rf /usr/local/bin/node
sudo rm -rf /usr/local/bin/npm

echo "Dang tai truc tiep bo cai Node 18 chuan cua Apple..."
curl -o node18.pkg https://nodejs.org/dist/v18.20.4/node-v18.20.4.pkg

echo "Dang tien hanh cai dat (Vui long nhap mat khau may Mac, go roi Enter, khong hien dau *)..."
sudo installer -pkg node18.pkg -target /

echo "Xoa file cai dat tam..."
rm node18.pkg

echo "Kiem tra phien ban:"
/usr/local/bin/node -v
/usr/local/bin/npm -v

echo "=== CAI DAT HOAN TAT ==="
echo "Hay dong Terminal nay, mo Terminal moi, cd vao thu muc code roi chay: npm install"
