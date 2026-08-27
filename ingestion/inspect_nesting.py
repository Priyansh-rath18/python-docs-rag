from bs4 import BeautifulSoup

file_path = r"D:\cv_project\pythonicx\raw data\python-3.11.15-docs-html\library\re.html"

with open(file_path, "r", encoding="utf-8") as f:
    html_content = f.read()

soup = BeautifulSoup(html_content, "html.parser")
main_content = soup.find("div", {"class": "body"})

top_section = main_content.find("section")

def print_nesting(section, depth=0):
    heading = section.find(["h1", "h2", "h3", "h4", "h5"], recursive=False)
    heading_text = heading.get_text(strip=True) if heading else "No direct heading"
    indent = "  " * depth
    print(f"{indent}[{heading.name if heading else '?'}] {heading_text}")
    
    # Find direct child sections (not grandchildren)
    child_sections = section.find_all("section", recursive=False)
    for child in child_sections:
        print_nesting(child, depth + 1)

print_nesting(top_section)

# Also report max depth found
def max_depth(section, current=0):
    child_sections = section.find_all("section", recursive=False)
    if not child_sections:
        return current
    return max(max_depth(c, current + 1) for c in child_sections)

print(f"\nMax nesting depth: {max_depth(top_section)}")