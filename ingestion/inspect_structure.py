from bs4 import BeautifulSoup

file_path = r"D:\cv_project\pythonicx\raw data\python-3.11.15-docs-html\tutorial\errors.html"

with open(file_path, "r", encoding="utf-8") as f:
    html_content = f.read()

soup = BeautifulSoup(html_content, "html.parser")
main_content = soup.find("div", {"class": "body"})

# 1. Look at heading tags and their text
print("=== HEADINGS ===")
for tag in main_content.find_all(["h1", "h2", "h3", "h4"]):
    print(f"{tag.name}: {tag.get_text(strip=True)}")

# 2. Look at how code blocks are structured
print("\n=== CODE BLOCKS (first 3) ===")
code_blocks = main_content.find_all(["pre"])
print(f"Total <pre> blocks found: {len(code_blocks)}")
for block in code_blocks[:3]:
    print("\n--- block ---")
    print("Parent div class:", block.parent.get("class"))
    print(block.get_text()[:200])

# 3. Check what wraps a heading + its content (is there a <section> or <div> per heading?)
print("\n=== TOP-LEVEL CHILDREN OF main_content ===")
for child in main_content.find_all(recursive=False)[:15]:
    print(f"<{child.name}> class={child.get('class')}")

# 4. Check nested sections
print("\n=== NESTED SECTIONS ===")
top_section = main_content.find("section")
nested_sections = top_section.find_all("section", recursive=False)
print(f"Direct child sections of top-level section: {len(nested_sections)}")

for sec in nested_sections[:5]:
    heading = sec.find(["h2", "h3"])
    heading_text = heading.get_text(strip=True) if heading else "No heading found"
    text_length = len(sec.get_text(strip=True))
    print(f"- {heading_text} (length: {text_length} chars)")