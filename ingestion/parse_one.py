from bs4 import BeautifulSoup

# Test with one file first
file_path = r"D:\cv_project\pythonicx\raw data\python-3.11.15-docs-html\tutorial\errors.html"

with open(file_path, "r", encoding="utf-8") as f:
    html_content = f.read()

soup = BeautifulSoup(html_content, "html.parser")

# Same content div as before
main_content = soup.find("div", {"class": "body"})

if main_content:
    text = main_content.get_text(separator="\n", strip=True)
    print("--- CLEAN TEXT PREVIEW (first 1000 chars) ---\n")
    print(text[:1000])
    print(f"\n\nTotal text length: {len(text)} characters")
else:
    print("Couldn't find main content div")

# Also grab the page title — useful metadata later
title_tag = soup.find("title")
if title_tag:
    print(f"\nPage title: {title_tag.get_text(strip=True)}")