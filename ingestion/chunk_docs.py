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

VERSIONS = {
    "python-3.11.15-docs-html": "3.11.15",
    "python-3.12-docs-html": "3.12",
    "python-3.13-docs-html": "3.13",
    "python-3.14-docs-html": "3.14",
}

MAX_CHUNK_SIZE = 1000  # chars — sections bigger than this get sub-split

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

def extract_code_blocks(section):
    """Pull out <pre> code blocks as separate clean strings."""
    code_blocks = []
    for pre in section.find_all("pre"):
        code_blocks.append(pre.get_text())
    return code_blocks

def get_own_text(section):
    """Get this section's text EXCLUDING any nested child <section> tags
    and excluding <pre> blocks (since those are stored separately)."""
    # Work on a copy so we don't mutate the original tree
    section_copy = BeautifulSoup(str(section), "html.parser").find("section")

    # Remove nested sections so get_text() only grabs this section's own content
    for nested in section_copy.find_all("section"):
        nested.decompose()

    # Remove code blocks from the text (stored separately)
    for pre in section_copy.find_all("pre"):
        pre.decompose()

    return section_copy.get_text(separator="\n", strip=True)

def split_long_text(text, max_size):
    """Simple paragraph-based sub-splitting for oversized sections."""
    if len(text) <= max_size:
        return [text]

    paragraphs = text.split("\n\n")
    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) <= max_size:
            current += ("\n\n" if current else "") + para
        else:
            if current:
                chunks.append(current)
            current = para

    if current:
        chunks.append(current)

    return chunks if chunks else [text]

def collect_leaf_chunks(section, heading_path, chunks_out):
    """Recurse through nested sections. Only emit a chunk when a section
    has no nested child sections (a leaf), OR always emit each level's
    own text if it has meaningful content of its own."""

    heading_tag = section.find(["h1", "h2", "h3", "h4", "h5"], recursive=False)
    heading_text = heading_tag.get_text(strip=True) if heading_tag else ""
    current_path = heading_path + [heading_text] if heading_text else heading_path

    child_sections = section.find_all("section", recursive=False)
    own_text = get_own_text(section)
    code_blocks = extract_code_blocks(section)
    # Only grab code blocks that belong directly to this section, not children
    own_code_blocks = []
    for pre in section.find_all("pre", recursive=False):
        own_code_blocks.append(pre.get_text())
    # find_all with recursive=False on 'pre' misses deeply nested pre's under
    # non-section wrapper divs (like div.highlight) at this level, so also
    # grab pre's whose closest section ancestor is this one
    for pre in section.find_all("pre"):
        if pre.find_parent("section") == section:
            if pre.get_text() not in own_code_blocks:
                own_code_blocks.append(pre.get_text())

    if own_text:  # this section has its own content worth saving
        sub_chunks = split_long_text(own_text, MAX_CHUNK_SIZE)
        for i, chunk_text in enumerate(sub_chunks):
            chunks_out.append({
                "section_path": " > ".join(current_path),
                "text": chunk_text,
                "code_blocks": own_code_blocks if i == 0 else [],  # attach code to first sub-chunk only
            })

    for child in child_sections:
        collect_leaf_chunks(child, current_path, chunks_out)

def parse_and_chunk_file(file_path, base_dir, version, page_title_fallback):
    with open(file_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, "html.parser")
    main_content = soup.find("div", {"class": "body"})
    if not main_content:
        return []

    top_section = main_content.find("section")
    if not top_section:
        return []

    title_tag = soup.find("title")
    page_title = title_tag.get_text(strip=True) if title_tag else page_title_fallback
    rel_path = os.path.relpath(file_path, base_dir)

    raw_chunks = []
    collect_leaf_chunks(top_section, [], raw_chunks)

    final_chunks = []
    for chunk in raw_chunks:
        final_chunks.append({
            "page_title": page_title,
            "section_path": chunk["section_path"],
            "text": chunk["text"],
            "code_blocks": chunk["code_blocks"],
            "source_file": rel_path,
            "version": version,
        })

    return final_chunks

def process_version(folder_name, version):
    base_dir = os.path.join(RAW_DIR, folder_name)
    output_dir = os.path.join(PROCESSED_DIR, f"python-{version}")
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n=== Chunking Python {version} ===")
    html_files = get_html_files(base_dir)
    print(f"Found {len(html_files)} files...")

    all_chunks = []
    for i, file_path in enumerate(html_files, 1):
        chunks = parse_and_chunk_file(file_path, base_dir, version, "Untitled")
        all_chunks.extend(chunks)
        if i % 100 == 0:
            print(f"  Processed {i}/{len(html_files)}...")

    output_path = os.path.join(output_dir, "chunks.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)

    print(f"Done: {len(all_chunks)} chunks -> {output_path}")
    return len(all_chunks)

# Main
summary = {}
for folder_name, version in VERSIONS.items():
    folder_path = os.path.join(RAW_DIR, folder_name)
    if not os.path.exists(folder_path):
        print(f"Skipping {version} — folder not found")
        continue
    count = process_version(folder_name, version)
    summary[version] = count

print("\n=== SUMMARY ===")
for version, count in summary.items():
    print(f"Python {version}: {count} chunks")