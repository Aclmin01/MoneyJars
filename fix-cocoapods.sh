#!/bin/bash
echo "Dang cai dat Homebrew (Cong cu quan ly thu vien chuan cua Apple)..."
echo "Buoc nay se hoi mat khau may Mac cua ban (go mat khau roi Enter) va tai khoang vai tram MB, vui long kien nhan nhe!"

# Cài đặt Homebrew tự động không cần bấm Enter
NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo "Dang cai dat CocoaPods (Ban moi nhat) qua Homebrew..."
# Đảm bảo đường dẫn brew trên Intel Mac
/usr/local/bin/brew install cocoapods

echo "Kiem tra lai phien ban CocoaPods:"
/usr/local/bin/pod --version

echo "=== CAI DAT HOAN TAT ==="
echo "Bay gio ban hay tro lai thu muc code va chay lai lenh:"
echo "npx expo prebuild --platform ios"
