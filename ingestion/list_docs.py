import os

# Point this to one version folder for now
BASE_DIR = r"D:\cv_project\pythonicx\raw data\python-3.11.15-docs-html"

# Only walk these subfolders — skip static assets, indexes, etc.
INCLUDE_FOLDERS = [
    "tutorial", "library", "reference", "c-api", "howto",
    "using", "faq", "whatsnew", "distributing", "installing",
    "extending", "install"
]

html_files = []

for folder in INCLUDE_FOLDERS:
    folder_path = os.path.join(BASE_DIR, folder)
    
    if not os.path.exists(folder_path):
        print(f"Skipping (not found): {folder_path}")
        continue
    
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(".html"):
                full_path = os.path.join(root, file)
                html_files.append(full_path)

print(f"\nTotal HTML files found: {len(html_files)}")
print("\nFirst 10 file paths:")
for path in html_files[:10]:
    print(path)