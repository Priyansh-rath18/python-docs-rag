import os
import json
from bs4 import BeautifulSoup

RAW_DIR = r"D:\cv_project\pythonicx\raw data"
PROCESSED_DIR = r"D:\cv_project\pythonicx\data\processed"

INCLUDE_FOLDERS = [
    "tutorial", "library", "reference", "c-api", "howto",
    "using", "faq", "whatsnew", "distributing", "installing",
    "extending", "install"
]

# Map folder name -> version label
VERSIONS = {
    "python-3.11.15-docs-html": "3.11.15",
    "python-3.12-docs-html": "3.12",
    "python-3.13-docs-html": "3.13",
    "python-3.14-docs-html": "3.14",
}

def get_html_files(base_dir):
    html_files = []
    for folder in INCLUDE_FOLDERS:
        folder_path = os.path.join(base_dir, folder)
        if not os.path.exists(folder_path):
            continue
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                if file.endswith(".html"):
                    html_files.append(os.path.join(root, file))
    return html_files

def parse_file(file_path, base_dir, version):
    with open(file_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, "html.parser")
    main_content = soup.find("div", {"class": "body"})

    if not main_content:
        return None

    text = main_content.get_text(separator="\n", strip=True)
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else "Untitled"
    rel_path = os.path.relpath(file_path, base_dir)

    return {
        "title": title,
        "source_file": rel_path,
        "text": text,
        "version": version
    }

def process_version(folder_name, version):
    base_dir = os.path.join(RAW_DIR, folder_name)
    output_dir = os.path.join(PROCESSED_DIR, f"python-{version}")
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n=== Processing Python {version} ===")
    html_files = get_html_files(base_dir)
    print(f"Found {len(html_files)} files...")

    results = []
    failed = []

    for i, file_path in enumerate(html_files, 1):
        parsed = parse_file(file_path, base_dir, version)
        if parsed:
            results.append(parsed)
        else:
            failed.append(file_path)

        if i % 100 == 0:
            print(f"  Processed {i}/{len(html_files)}...")

    output_path = os.path.join(output_dir, "parsed_docs.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Done: {len(results)} saved, {len(failed)} failed -> {output_path}")
    return len(results), len(failed)

# Main
summary = {}
for folder_name, version in VERSIONS.items():
    folder_path = os.path.join(RAW_DIR, folder_name)
    if not os.path.exists(folder_path):
        print(f"Skipping {version} — folder not found: {folder_path}")
        continue
    saved, failed = process_version(folder_name, version)
    summary[version] = {"saved": saved, "failed": failed}

print("\n=== SUMMARY ===")
for version, counts in summary.items():
    print(f"Python {version}: {counts['saved']} saved, {counts['failed']} failed")