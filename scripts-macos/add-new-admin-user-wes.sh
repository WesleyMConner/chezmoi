# Using the newer "adduser", which is more interactive than the older "useradd".
echo "..... Adding New User 'wes' as an admin ................................"
# By default, Ubuntu places new user bob in the bob group (bob:bob).
sudo /usr/sbin/adduser \
  --home /home/wes \
  --shell /bin/zsh \
  --gecos "Wesley M. Conner" \
  wes
echo "..... Adding 'wes' to sudo ............................................."
sudo /usr/sbin/usermod --append --groups sudo wes
echo "..... Group memberships for 'wes' ......................................"
groups wes
