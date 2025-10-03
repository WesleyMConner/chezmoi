import re
import sys
from pathlib import Path
import shutil

// When dumping ChatGPT conversations as HTML and converting them to AsciiDoc, there is a lot of spurious Unicode. This script removes some of that unwanted Unicode.
*
CHARS_TO_REMOVE = (
    "⃣ -–—…’“”§•→↓↔÷×−≈≤⋮⌘⌥⌨⏱⏲─│└├☐☑⚖⚙⚠⚰✅✔✖✳❌❓❗➕➖➡➤"
    "🌀🌱🎉🎛🎮🎯🎹🏠🏷🐍👉👌👍👏👤💡💥💰💸💼📁📂📄📅📆📉📊📋📌📍📎"
    "📘📚📝📠📡📥📦📬📮📱📺🔁🔄🔇🔈🔌🔍🔎🔐🔑🔒🔗🔚🔢🔧🔴🔸🔹🕒🕹🖥🗂🗒"
    "🤖🥇🥈🥉🧠🧩🧪🧭🧮🧯🧰🧱🧼🧾🪄😊🙂🙌🚀🚦🚧🚨🚫🛑🛠🟡🟪½🅰🅱é🅾🆚"
)

# Regex for unwanted chars
PATTERN = re.compile(f"[{re.escape(CHARS_TO_REMOVE)}]")

def clean_text(text: str) -> str:
    """Remove unwanted characters from text."""
    return PATTERN.sub("", text)

def process_file(file_path: Path, inplace: bool = True, backup: bool = True):
    """Clean a file, optionally in place with backup."""
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    cleaned = clean_text(text)

    if inplace:
        if backup:
            backup_path = file_path.with_suffix(file_path.suffix + ".bak")
            if not backup_path.exists():  # avoid overwriting previous backup
                shutil.copy(file_path, backup_path)
                print(f"💾 Backup created: {backup_path}")
        file_path.write_text(cleaned, encoding="utf-8")
        print(f"✔ Cleaned: {file_path}")
    else:
        print(cleaned)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python clean_chars.py <file_or_directory> [--no-inplace] [--no-backup]")
        sys.exit(1)

    target = Path(sys.argv[1])
    inplace = "--no-inplace" not in sys.argv
    backup = "--no-backup" not in sys.argv

    if target.is_file():
        process_file(target, inplace=inplace, backup=backup)
    elif target.is_dir():
        for file in target.rglob("*.*"):
            try:
                process_file(file, inplace=inplace, backup=backup)
            except Exception as e:
                print(f"⚠ Skipping {file}: {e}")
    else:
        print("❌ Invalid path.")
