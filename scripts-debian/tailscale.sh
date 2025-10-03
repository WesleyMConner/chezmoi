# Codename |   Version
# ---------+--------------
#   jammy  | Ubuntu 22.02
#   noble  | Ubuntu 24.02

echo "Using curl to obtain Tailscale's apt key and sources list ..... "
curl -fsSL https://tailscale.com/install.sh | sh
echo "..... Udpdating APT ...................................................."
sudo apt-get update
echo "..... Installing the latest Tailscale .................................."
sudo apt-get install tailscale
echo "..... Tailscale up and accepting routes via sudo ......................."
sudo tailscale up --accept-routes
echo "..... Allowing use of 'tailscale' without root ........................."
sudo tailscale set --operator=$USER
echo "..... Get tailscale status ............................................."
tailscale status
