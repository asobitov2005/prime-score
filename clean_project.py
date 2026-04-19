import os
import shutil
from pathlib import Path

def clean():
    base_dir = Path(r"C:\Users\admin\Desktop\PrimeScore\prime-score")
    
    # 1. Delete .babelrc files
    babel_files = [
        base_dir / "frontend" / ".babelrc",
        base_dir / "admin" / ".babelrc"
    ]
    for f in babel_files:
        if f.exists():
            print(f"Deleting {f}")
            f.unlink()

    # 2. Folders to delete
    folders_to_clean = [
        base_dir / "backend" / ".venv",
        base_dir / "frontend" / "node_modules",
        base_dir / "frontend" / ".next",
        base_dir / "admin" / "node_modules",
        base_dir / "admin" / ".next"
    ]
    
    for folder in folders_to_clean:
        if folder.exists():
            print(f"Deleting folder: {folder}")
            try:
                shutil.rmtree(folder)
            except Exception as e:
                print(f"Error deleting {folder}: {e}")

if __name__ == "__main__":
    clean()
