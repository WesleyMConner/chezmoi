sudo apt update
sudo apt install restic -y

restic version

# Mount point is /mnt/T7_DATA

restic -r /mnt/T7_DATA/restic-repo

# Config File for Credentials (not 1Pwd-aware yet)
nano ~/.restic-env
 export RESTIC_REPOSITORY=/mnt/T7_DATA/restic-repo
 export RESTIC_PASSWORD=yourStrongPasswordHere

# Save and make restic load locally
echo 'source ~/.restic-env' >> ~/.bashrc
source ~/.restic-env

# Run a backup
restic backup /home/x

# For pruning - brute force
restic backup /home/x --exclude /home/x/Downloads --exclude /home/x/.cache

# For pruning -via an exclude file - PART 1
nano /home/x/.restic-excludes
 /home/x/Downloads
 /home/x/.cache
restic backup /home/x --exclude-file=/home/x/.restic-excludes

# For pruning -via an exclude file - PART 2
sudo nano /etc/systemd/system/restic-backup.service
 ExecStart=/usr/bin/restic backup /home/x --exclude-file=/home/x/.restic-excludes
 ExecStartPost=/usr/bin/restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune

# Run automatically using a Systemd Timer
sudo nano /etc/systemd/system/restic-backup.service
 [Unit]
 Description=Restic Backup

 [Service]
 Type=oneshot
 EnvironmentFile=/home/x/.restic-env
 ExecStart=/usr/bin/restic backup /home/x

# Create a Timer
sudo nano /etc/systemd/system/restic-backup.timer
 [Unit]
 Description=Run Restic Backup Daily

 [Timer]
 OnCalendar=daily
 Persistent=true

 [Install]
 WantedBy=timers.target

# Enable and start
sudo systemctl enable --now restic-backup.timer

# Check Timer
systemctl list-timers --all

# Restore Files to /tmp/restore
restic restore latest --target /tmp/restore

# Prune and Forget Policies
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune

# Edit the backup servcie file to change start time
sudo nano /etc/systemd/system/restic-backup.service
 # Change Exec Start to ...
 #   (1) runs backup
 #   (2) Cleans up old snapshots
 ExecStart=/usr/bin/restic backup /home/x
 ExecStartPost=/usr/bin/restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune

# Reload systemd and restart the timer
sudo systemctl daemon-reexec
sudo systemctl restart restic-backup.timer

# If the mounted destination file is not available, expect this failure:
#   Fatal: unable to open repository at /mnt/backup/restic-repo: repository does not exist
# restic exits with non-zero status
# journal-ctl -u restic-backup.service will reflect the error
# No backup occurs until the drive is available again.

# To make the backup service depend on the mount ...
# Create a "mount unit" (automatically) .. e.g., mnt-backup.mount
 systemctl daemon-reload
 systemctl list-units --type=mount | grep mnt-backup
# AND Add the following to "restic-backup.service"
 [Unit]
 Description=Restic Backup
 Requires=mnt-backup.mount
 After=mnt-backup.mount
# Have systemd call "restic-backup.service" in lieu of restic.
 ExecStart=/usr/local/bin/restic-backup.sh

C H E A T S H E E T

---

# Restic Backup Cheat Sheet

## 1. First-Time Setup

Initialize repo on SSD:

```bash
restic -r /mnt/backup/restic-repo init
```

## 2. Environment Setup (optional, makes commands shorter)

In `~/.restic-env`:

```bash
export RESTIC_REPOSITORY=/mnt/backup/restic-repo
export RESTIC_PASSWORD=yourStrongPasswordHere
```

Load into shell:

```bash
source ~/.restic-env
```

---

## 3. Backup

Basic backup of `/home/x`:

```bash
restic backup /home/x
```

With exclude file (`~/.restic-excludes`):

```bash
restic backup /home/x --exclude-file=/home/x/.restic-excludes
```

---

## 4. Check Snapshots

List all snapshots:

```bash
restic snapshots
```

Show details of one snapshot:

```bash
restic snapshots --host $(hostname)
```

---

## 5. Restore

Restore latest backup to `/tmp/restore`:

```bash
restic restore latest --target /tmp/restore
```

Restore specific snapshot:

```bash
restic restore <snapshot-id> --target /tmp/restore
```

Restore a single file:

```bash
restic restore latest --target /tmp/restore --include /home/x/Documents/file.txt
```

---

## 6. Cleanup / Retention

Keep 7 daily, 4 weekly, 12 monthly snapshots:

```bash
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
```

Keep only last 5 backups:

```bash
restic forget --keep-last 5 --prune
```

---

## 7. Integrity Checks

Verify repository:

```bash
restic check
```

Rebuild index (if needed):

```bash
restic rebuild-index
```

---

## 8. Useful Extras

Show repo stats (size, snapshots):

```bash
restic stats
```

Show files in a snapshot:

```bash
restic ls latest
```

---

**Golden rules**:

* Always test restores. Backups are only good if you can restore them.
* Never lose your repo password — without it, backups are unrecoverable.
* Unmount the SSD cleanly after backups:

  ```bash
  sudo umount /mnt/backup
  ```

---

Would you like me to put this into a **single printable PDF cheat sheet** (1 page) so you can keep it handy?








